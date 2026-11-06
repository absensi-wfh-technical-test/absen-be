# 04 — Evaluasi Signature Request API

## Status keputusan

**[Keputusan — terimplementasi 6 November 2026]** Pemanggilan `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, dan endpoint bisnis domain dari React membawa signature dengan **pasangan kunci asimetris per sesi** (pilihan C). JSON/GET/DELETE memakai `v1`, sedangkan upload foto memakai `v2` dengan digest bytes foto. Guard dan penolakan perubahan bytes foto telah diuji pada API lokal; rincian bukti ada di [progres](../06-implementation-planning/07-implementation-progress.md). Bentuk HMAC global pada bagian berikut tetap merupakan usulan yang ditolak untuk browser.

Usulan ini adalah **keputusan keamanan proyek**, bukan kewajiban eksplisit PDF Dexa Group. Kontrak autentikasi dan otorisasi yang berlaku tetap berada di [kontrak API](02-kontrak-api-dan-keamanan.md).

## Bentuk usulan dari sisi request

Untuk menyamakan istilah, rancangan awal yang diusulkan dapat ditulis sebagai berikut. Ini **belum merupakan kontrak yang aman untuk React SPA**.

```text
X-Request-Timestamp: <Unix epoch milliseconds yang dibuat pengirim>
X-Request-Signature: <HMAC-SHA256 dalam hex/base64url>

signatureBase = UPPERCASE(method) + "\n" + canonicalPathAndQuery + "\n" + timestamp
signature = HMAC-SHA256(secretKey, UTF8(signatureBase))
```

`secretKey` adalah **kunci HMAC**, bukan teks yang ditempel di akhir payload. Method harus huruf besar. Target yang ditandatangani harus mencakup path `/api/...` dan query string dalam bentuk kanonis yang disepakati; jangan hanya menandatangani nama route NestJS atau URL sebelum Vite proxy. Timestamp dibuat **satu kali oleh pengirim tepat sebelum request** dan dikirim apa adanya. Verifikator memakai nilai timestamp yang diterima untuk menghitung ulang signature; ia tidak membuat timestamp pengganti untuk `signatureBase`.

Waktu perangkat browser adalah **waktu klien**, bukan waktu server. Backend tetap perlu membaca jam server untuk memeriksa kesegaran timestamp, misalnya toleransi selisih ±5 menit **[Rancangan]**. Selisih beberapa detik tidak perlu menghasilkan signature berbeda karena kedua pihak menghitung HMAC dari **nilai header yang sama**. Jam klien yang jauh meleset, timestamp lama, format salah, dan timestamp terlalu jauh di masa depan harus ditolak dengan kode yang stabil jika mekanisme ini kelak diaktifkan. Timestamp ini tidak menggantikan `checkInAt`/`attendanceDate` yang tetap ditentukan Attendance Microservice.

## Mengapa kunci backend saja tidak cukup untuk signature dari React

HMAC hanya dapat dibuat dan diverifikasi oleh pihak yang memiliki kunci bersama. Jika `REQUEST_SIGNATURE_SECRET` hanya ada di env backend, React **tidak dapat** menghitung HMAC. Mengirim kunci itu melalui bundle Vite, `VITE_*`, respons login, atau konfigurasi runtime membuat kunci dapat dibaca dan dipakai ulang oleh pengguna browser. Backend yang menandatangani lebih dahulu untuk frontend juga tidak membuktikan bahwa request berikutnya berasal dari frontend tepercaya. Karena itu signature browser dengan **satu kunci global backend** tidak boleh dipakai sebagai lapisan autentikasi atau alasan melonggarkan JWT, pemeriksaan role/status aktif, validasi, dan HTTPS. Prinsip ini mengikuti [OWASP Web Frontend Security](https://cheatsheetseries.owasp.org/cheatsheets/Web_Frontend_Security_Cheat_Sheet.html) dan sifat kunci bersama [HMAC RFC 2104](https://www.rfc-editor.org/rfc/rfc2104).

Selain masalah kunci, method + path + timestamp **tidak mengikat body** JSON/foto. Pihak yang memperoleh request dan signature dapat mengubah bagian yang tidak ditandatangani tanpa mengubah hasil verifikasi; signature yang sama juga dapat diputar ulang selama masih berada di jendela waktu. Jika signature diterapkan pada komunikasi antarlayanan, cakupannya perlu memuat digest body yang benar-benar diterima, query yang dikanonisasi, dan nonce unik yang disimpan selama jendela penerimaan. Tetap gunakan TLS. Rujukan teknis: [RFC 9421, pertimbangan cakupan dan replay](https://www.rfc-editor.org/rfc/rfc9421.html#section-7).

## Pilihan arsitektur yang dapat dijalankan

| Pilihan | Alur | Penilaian untuk proyek ini |
| --- | --- | --- |
| **A — JWT tanpa proof browser (opsi yang tidak dipilih)** | React → NestJS HTTP API dengan JWT, HTTPS pada deploy, CORS terbatas, validasi dan otorisasi backend. | Tidak sesuai keputusan signature browser yang sudah diterapkan. |
| **B — Signature pada batas server ke server** | React → HTTP API dengan JWT; HTTP API menandatangani pesan ke Attendance Microservice memakai kunci yang hanya ada di env kedua proses. | Kunci dapat tetap rahasia karena penandatangan dan verifikator adalah proses backend. Ini **rancangan tambahan**, bukan pengganti JWT browser. Butuh kontrak pesan, canonicalization, rotasi kunci, dan tes replay. |
| **C — Bukti kepemilikan kunci per klien (dipilih)** | Browser membuat pasangan kunci asimetris per sesi; backend mengenali kunci publik dan memverifikasi proof tiap request. | Sudah berlaku untuk auth; endpoint domain baru menerapkan guard yang sama. Tidak ada `REQUEST_SIGNATURE_SECRET` global di browser. |

Jika kebutuhan bisnis benar-benar mewajibkan **header signature pada fetch React**, harus diputuskan dahulu apa tujuan ancamannya dan dari mana browser memperoleh kemampuan menandatangani. Signature yang dapat dibuat oleh semua pengguna browser tidak membuktikan bahwa pemanggil adalah aplikasi resmi. Tidak ada solusi HMAC yang sekaligus memenuhi dua syarat berikut: **React menandatangani sendiri** dan **kunci HMAC hanya diketahui backend**.

## Kontrak yang dipilih untuk endpoint autentikasi

1. Saat login pertama, frontend membuat pasangan ECDSA P-256 dengan Web Crypto. Private key tidak diekspor dan hanya berada di memori tab; public key dikirim per request. Browser yang di-refresh harus login ulang. Ini bukan identitas aplikasi resmi dan tidak menggantikan password login.
2. Setiap request auth membawa `X-Request-Timestamp` (Unix epoch milidetik dari frontend), `X-Request-Nonce` (UUID acak unik), `X-Request-Key` (public JWK yang dikodekan base64url), dan `X-Request-Signature` (ECDSA SHA-256, format IEEE P1363/base64url). Backend tidak membuat timestamp pengganti ketika menghitung ulang signature.
3. Bytes UTF-8 yang ditandatangani adalah `v1\nMETHOD\nPATH_AND_QUERY\nTIMESTAMP\nNONCE\nBODY_SHA256_BASE64URL`. `METHOD` huruf besar; `PATH_AND_QUERY` adalah target HTTP aktual berawalan `/api` dengan query sebagaimana dikirim; digest memakai **raw body** yang diterima (SHA-256 dari body kosong untuk GET/logout). Satu separator newline dan encoding ini wajib sama di kedua sisi.
4. Backend memeriksa bentuk header, public JWK hanya EC P-256 tanpa private key, signature, selisih timestamp dari jam server maksimal ±120 detik, lalu menolak nonce yang sudah dipakai dalam jendela yang sama. Replay cache di proses API cukup untuk MVP **satu instance**; deployment beberapa instance memerlukan penyimpanan nonce bersama. Jam server hanya untuk batas kesegaran.
5. Login berhasil memasukkan thumbprint SHA-256 public JWK (`cnf.jkt`) ke JWT. `/me` dan `/logout` mewajibkan JWT valid **dan** signature yang public key-nya cocok dengan thumbprint JWT. Token yang dicuri tanpa private key tidak cukup untuk memanggil endpoint ini. Logout tetap 204 stateless: frontend membuang token dan pasangan kunci; server belum merevoke JWT.
6. Error aman dan terstruktur: signature hilang/salah, key tidak cocok, timestamp di luar jendela, atau nonce replay → `401 SIGNATURE_INVALID`/`SIGNATURE_EXPIRED`/`SIGNATURE_REPLAYED`. Password salah tetap `401 UNAUTHENTICATED`; jangan membocorkan kunci, signature, token, body password, atau detail verifikasi ke log.

Kontrak ini khusus aplikasi saat ini dan **bukan klaim implementasi penuh RFC 9449 DPoP**. Ia menambah digest body di atas proof method/path/waktu. Model pengikatan public key ke token mengikuti gagasan [RFC 9449](https://www.rfc-editor.org/rfc/rfc9449.html); penggunaan private key di browser tetap tidak menahan skrip berbahaya yang sudah berjalan pada origin yang sama. HTTPS, JWT, pemeriksaan status aktif/role, validasi, dan rate limit tetap wajib. `REQUEST_SIGNATURE_SECRET` tidak diperlukan untuk opsi ini; `JWT_SECRET` backend tetap rahasia dan berbeda fungsi.

## Kontrak yang harus dikunci bila memilih B

1. Simpan kunci acak yang sama pada env **dua proses backend** (contoh nama `REQUEST_SIGNATURE_SECRET`); jangan kirim ke React, repo, log, atau respons. Tetapkan cara rotasi dan identitas kunci sebelum deploy.
2. Tetapkan payload kanonis berversi: method/pattern, target, timestamp, digest body, nonce, serta encoding dan aturan query. Jangan memakai penggabungan string ambigu. Untuk TCP NestJS, definisikan envelope internal yang eksplisit alih-alih meniru header HTTP yang tidak ada pada transport TCP.
3. Pengirim membuat timestamp sekali untuk pesan internal; penerima memakai nilai yang dikirim untuk HMAC dan jamnya sendiri **hanya** untuk batas kesegaran. Selisih jam diselesaikan dengan sinkronisasi waktu dan toleransi terukur, bukan dengan mengganti timestamp yang ditandatangani.
4. Verifikasi signature dengan perbandingan waktu konstan; tolak signature hilang/salah, timestamp di luar jendela, dan nonce yang pernah dipakai. Simpan nonce dalam penyimpanan bersama bila penerima dapat berjalan lebih dari satu instance.
5. Uji perubahan method/target/query/body, replay, clock skew, rotasi kunci, multipart/foto bila relevan, serta kegagalan layanan. Signature internal tidak mengubah hak akses `ADMIN`/`EMPLOYEE` atau kepemilikan data absensi.

**Batas implementasi:** pilihan C berlaku untuk endpoint autentikasi. Replay cache masih berada dalam satu proses NestJS; deployment beberapa instance memerlukan cache bersama. Proof browser tidak mencegah skrip berbahaya pada origin yang sama memakai kunci selama tab hidup. Upload multipart dan endpoint domain belum memakai mekanisme ini. Pilihan B untuk TCP antarlayanan tetap terpisah dan belum diputuskan. Jangan menaruh `REQUEST_SIGNATURE_SECRET` pada frontend atau mengklaim endpoint domain sudah memiliki signature sebelum guard-nya diterapkan.

## Ekstensi terencana untuk endpoint bisnis HTTP

Semua endpoint bisnis baru memakai public key per sesi yang cocok dengan JWT. Untuk JSON dan request tanpa body, gunakan canonical string `v1` di atas. Upload `POST /api/attendances` serta `PATCH /api/attendances/:id/photo` memakai `v2\nMETHOD\nPATH_AND_QUERY\nTIMESTAMP\nNONCE\nPHOTO_SHA256_BASE64URL`. Hash adalah SHA-256 **bytes foto yang diparse**, bukan boundary multipart yang dibuat browser. Form hanya boleh berisi tepat satu file `photo` tanpa field teks; metadata filename/MIME tidak menjadi sumber kebenaran, tipe ditentukan dari isi file. Browser membuat timestamp dan nonce sekali per request. Server membatasi ukuran/jumlah file, memeriksa JWT/role sebelum parse, memverifikasi digest/signature dan key binding setelah parse, lalu baru menyimpan atau meneruskan TCP. Nonce dicatat setelah proof valid. Ini adalah kontrak khusus endpoint foto, bukan perubahan diam-diam pada proof `v1` auth.
