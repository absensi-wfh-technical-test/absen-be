# 03 — Umpan Balik Interaksi dan Sistem Visual

Dokumen ini menetapkan perilaku antarmuka `UI-01`–`UI-08` dan arah redesign 7 November 2026. Ia melengkapi [navigasi dan alur](01-navigasi-dan-alur.md) serta [spesifikasi layar](02-spesifikasi-layar.md). Kebutuhan bisnis dan respons API tetap mengikuti dokumen terkait; pola visual tidak boleh membuat klaim sukses sebelum respons atau data tersimpan diverifikasi. Status implementasi dan bukti mengikuti [progres](../06-implementation-planning/07-implementation-progress.md).

## Prinsip pengalaman

1. **Setiap aksi memberi respons.** Klik/tap langsung mengubah keadaan kontrol; hasil akhir menjelaskan apa yang terjadi dan tindakan berikutnya bila gagal.
2. **Kepastian lebih penting daripada efek.** Notifikasi sesaat mempertegas hasil, sedangkan informasi penting seperti absensi hari ini, error form, dan sesi habis tetap terlihat di layar.
3. **Hirarki yang terasa hidup.** Kontras ukuran, ruang, warna, permukaan, ikon bermakna, dan transisi singkat membedakan prioritas. Elemen dekoratif tidak bersaing dengan data dan tombol utama.
4. **Konsistensi lintas peran.** Pola tombol, form, notifikasi, loading, dan navigasi sama; isi dan prioritas halaman menyesuaikan pekerjaan karyawan atau HRD.
5. **Gerak membantu orientasi.** Animasi menjelaskan kemunculan, perpindahan, atau hasil. Semua informasi tetap dapat dibaca tanpa animasi.

## Pola umpan balik per aksi

| Aksi / layar | Selama proses | Sukses | Gagal atau hasil belum pasti |
| --- | --- | --- | --- |
| Login `UI-01` (`FR-01`) | Tombol menjadi `Memeriksa akun…`, spinner kecil, cegah submit ganda; form tetap terlihat. | Setelah login **dan** `/me` terverifikasi, arahkan sesuai role. Tampilkan notifikasi singkat **di halaman tujuan**: `Berhasil masuk. Selamat datang, {nama}.` Fokus awal menuju judul halaman tujuan; notifikasi tidak mengambil fokus. | Kredensial salah/akun nonaktif: pesan generik dekat form, tanpa toast duplikat. Kegagalan jaringan/signature: pesan aman dan aksi `Coba lagi`; isian email tetap ada, kata sandi boleh tetap selama form masih terbuka tetapi tidak disimpan. |
| Logout dari area aplikasi (`UI-01`, `UI-08`) | Setelah memilih `Keluar`, nonaktifkan aksi agar tidak terpanggil dua kali. | Bersihkan sesi dan kunci proof di klien, arahkan ke `/login`, lalu tampilkan `Berhasil keluar dari aplikasi ini.` di halaman login. | Jika konfirmasi API gagal tetapi sesi lokal sudah dibersihkan, tetap arahkan ke login dengan pesan jujur: `Anda sudah keluar dari aplikasi ini. Koneksi ke server sempat terganggu.` Jangan menyebut token telah dicabut di server; logout saat ini tidak memiliki daftar pencabutan token. |
| Check-in `UI-02` (`FR-04`, `FR-06`) | Tampilkan pratinjau foto dan `Mengirim absensi…`; cegah submit ganda. | Perbarui panel status hari ini secara **persisten** dengan tanggal, jam server, dan foto; notifikasi singkat `Absensi berhasil dicatat.` hanya pelengkap. | Validasi file dekat input; 409 muat catatan yang sudah ada. Timeout: `Status pengiriman belum pasti. Kami akan memeriksa absensi hari ini.` lalu baca status sebelum tawarkan ulang. Tidak ada toast sukses sampai catatan diverifikasi. |
| Simpan karyawan `UI-05` (`FR-02`, `FR-03`) | Tombol `Menyimpan…`, input tidak hilang; cegah submit ganda. | Tampilkan detail/daftar dengan data terbaru dan notifikasi `Data karyawan berhasil disimpan.` | Error field tetap dekat field dan fokus ke kesalahan pertama; konflik email/kode tidak menghapus isian. Kesalahan server memakai pesan dan `Coba lagi` bila aman. |
| Aktif/nonaktif karyawan `UI-05` (`FR-09`, P1) | Dialog menyebut akibatnya; tombol konfirmasi menunjukkan proses. | Ubah badge status yang terlihat persisten, lalu notifikasi misalnya `Akun karyawan dinonaktifkan.` | Dialog tetap terbuka atau kembali ke detail dengan penjelasan gagal; status lama tidak diubah secara optimistis. |
| Filter/list/detail `UI-03`, `UI-04`, `UI-06`, `UI-07` | Loading lokal pada area data; filter dan konteks navigasi tetap terlihat. | Hasil, jumlah, filter aktif, dan detail yang dimuat menjadi sumber informasi utama; tidak perlu toast untuk pembacaan rutin. | Empty state membedakan belum ada data dan tidak ada hasil filter. Kegagalan memuat memberi `Coba lagi` tanpa mereset filter; foto gagal tidak menyembunyikan metadata. |
| Sesi habis / tidak berizin `UI-08` | Hentikan aksi yang memerlukan sesi dan bersihkan token serta kunci proof. | — | Sesi habis: arahkan ke login dengan pesan **persisten** `Sesi Anda berakhir. Silakan masuk kembali.` 403: tampilkan halaman akses ditolak dengan jalan kembali, bukan toast yang hilang sendiri. |
| Pemulihan sesi setelah refresh/browser dibuka lagi | Tampilkan `Memeriksa sesi…` tanpa form login atau redirect sementara. | Setelah `/me` valid, tampilkan route sesuai role tanpa toast login baru. | Jaringan gagal: pertahankan record dan tawarkan `Coba lagi`/`Masuk ulang`. Token/kunci hilang, kedaluwarsa, atau 401: hapus record dan tampilkan login dengan pesan sesi berakhir. |

### Perilaku notifikasi sesaat

- Satu komponen notifikasi aplikasi dipakai lintas halaman dan tetap hidup saat navigasi. Sukses login/logout yang menghasilkan perpindahan route harus muncul **setelah** halaman tujuan siap, sekali saja; refresh tidak boleh mengulanginya. Isi hanya label hasil dan konteks yang aman, tanpa token, password, path foto, atau detail internal API.
- Posisi: kanan atas pada desktop, area atas dengan jarak aman dari tepi pada ponsel. Jangan menutupi judul, kontrol navigasi, atau tombol utama. Bila ada beberapa hasil beruntun, tampilkan paling banyak dua; gabungkan pesan identik dan urutkan yang terbaru.
- Notifikasi sukses nonkritis tampil sekitar **4 detik**, dapat ditutup lewat tombol berlabel `Tutup notifikasi`, lalu hilang. Jeda hitung saat pointer berada di atasnya atau fokus keyboard berada di dalamnya. Error yang memerlukan tindakan tetap di form/banner sampai masalah terselesaikan atau pengguna menutupnya; jangan hilangkan otomatis.
- Transisi masuk: opacity `0 → 1` dan geser vertikal kecil `8px → 0` selama kira-kira **180 ms**. Transisi keluar: opacity `1 → 0` selama kira-kira **160 ms**. Tidak ada gerak memantul atau pergeseran layout; ruang notifikasi diatur overlay yang tidak menggeser konten utama.
- Ikon sukses/error/info disertai teks, bukan warna saja. Sukses diumumkan dengan live region sopan (`role="status"`); error yang perlu segera dibaca memakai `role="alert"` secara terbatas agar tidak ada pengumuman ganda dengan error field. Notifikasi tidak memindahkan fokus; fokus tetap mengikuti aksi atau judul halaman tujuan.
- Jika `prefers-reduced-motion: reduce`, hilangkan translasi dan gunakan kemunculan langsung atau perubahan opacity minimal. Auto-dismiss tetap tidak boleh menjadi satu-satunya tempat informasi penting.

## Sistem visual yang memberi karakter

Gunakan token dasar pada [spesifikasi layar](02-spesifikasi-layar.md#komponen-dan-bahasa-visual), lalu kembangkan konsisten sebagai berikut. Token utama telah diterapkan di CSS frontend; kecocokan setiap keadaan layar tetap harus diverifikasi di browser.

Redesign memakai shell desktop dengan navigasi samping ringkas, identitas pengguna di bagian bawah sidebar, dan konten maksimal sekitar 1250 px. Ponsel memakai header dan tab navigasi yang tidak tersembunyi; fokus, label, dan urutan baca tetap logis. Login desktop memakai panel identitas produk serta form yang dominan, lalu menjadi satu kolom di ponsel. Gunakan ikon garis dan motif geometris sederhana secara konsisten. Panel status, waktu, foto, hasil filter, dan aksi utama mendapat aksen; kartu informasi biasa tidak semuanya diberi warna atau bayangan kuat. Filter memakai grid `minmax(0, 1fr)`, kontrol `min-width: 0; width: 100%`, serta jarak horizontal minimal 16 px.

| Unsur | Aturan rancangan | Tujuan |
| --- | --- | --- |
| Tipografi | Skala judul halaman sekitar `28–32px`, judul kartu `20–24px`, isi `16px`, label/meta `13–14px`; berat dan tinggi baris dibedakan jelas. | Beranda langsung memandu mata ke status dan tindakan utama. |
| Permukaan | Latar netral terang; kartu putih dengan border halus, radius utama `18px`, bayangan ringan hanya pada elemen yang perlu diangkat. | Memberi kedalaman tanpa membanjiri halaman dengan kotak serupa. |
| Aksen | Biru utama untuk satu CTA primer per konteks, hijau untuk berhasil, merah untuk kesalahan/aksi berisiko, warna lembut untuk panel informasi. Ikon pendukung memakai satu gaya yang konsisten. | Prioritas mudah dikenali tanpa bergantung pada warna saja. |
| Ruang | Sistem jarak kelipatan `4px`; antarbagian utama lebih longgar daripada jarak antarlabel dan input. Lebar konten dibatasi agar form dan tabel mudah dibaca. | Layar terasa lapang dan terstruktur, bukan kosong atau padat. |
| Keadaan kontrol | Hover/focus/pressed/disabled jelas. Focus ring terlihat di atas warna permukaan; disabled tetap terbaca dan disertai alasan bila membingungkan. | Antarmuka terasa responsif dan dapat dipakai keyboard. |
| Data | Tanggal/jam server dan status diberi tempat menonjol. Status `Sudah absen`, `Belum absen`, `Aktif`, `Nonaktif` selalu punya teks; foto bukti tampil dalam bingkai tetap agar layout stabil. | Data utama tidak tenggelam di dekorasi. |

**Komposisi layar:** `UI-01` memakai identitas produk yang jelas, headline singkat, kartu form dengan ruang cukup, dan aksen grafis sederhana yang tidak mengganggu field. `UI-02` menempatkan status hari ini sebagai hero informasi dan tombol check-in sebagai tindakan utama; riwayat menjadi informasi sekunder. `UI-04`/`UI-06` menata judul, aksi/filter, ringkasan hasil, lalu daftar agar mudah dipindai. `UI-05` mengelompokkan field sesuai makna, bukan satu kolom panjang tanpa pembagian. `UI-07` menonjolkan waktu dan foto bukti, sementara metadata tetap dapat dibaca saat foto gagal. `UI-08` memakai ilustrasi/ikon ringan hanya jika membantu orientasi dan tetap menyediakan tindakan pemulihan.

**Responsif:** Pada lebar sempit, susun kartu dan form satu kolom, pertahankan CTA dalam jangkauan tanpa menutup konten, dan letakkan notifikasi di area atas yang tidak menutupi form. Pada desktop, gunakan ruang untuk ringkasan dan tabel yang dapat dipindai, bukan memperlebar baris teks tanpa batas. Status, filter, dan aksi tidak boleh hilang hanya karena layout berubah.

**Dialog konfirmasi:** Fokus awal berada pada aksi batal/bertahan yang aman. Tab dan Shift+Tab berputar di dalam dialog; Escape menutup tanpa menjalankan aksi dan mengembalikan fokus ke pemicu. Tindakan yang menghapus data tetap memerlukan klik pada tombol konfirmasi. Peringatan penutupan tab mengikuti dialog bawaan browser.

## Gerak dan keadaan mikro

| Peristiwa | Perilaku |
| --- | --- |
| Tombol ditekan | Umpan balik visual singkat pada pressed; segera tampilkan label proses untuk aksi jaringan. Hindari spinner yang menggantikan label tanpa penjelasan. |
| Input fokus/error | Border/focus ring berubah dengan jelas; error muncul dekat field tanpa menggeser fokus secara tak terduga. Jangan memakai getar atau animasi berulang untuk error. |
| Konten dimuat | Skeleton mengikuti bentuk konten yang akan datang; gunakan hanya jika pemuatan cukup terasa, lalu ganti tanpa kilatan dan pergeseran besar. |
| Pergantian halaman | Transisi ringan pada konten boleh dipakai, sekitar `150–200 ms`; navigasi dan fokus tidak menunggu animasi. Jangan menyembunyikan layar lama terlalu lama. |
| Status sukses | Ikon/status dapat muncul dengan fade singkat; hasil dan angka/tanggal tetap diam serta terbaca. Tidak ada confetti pada alur kerja absensi. |

## Pemeriksaan sebelum implementasi dianggap sesuai

- Jalankan alur login benar/salah, logout normal/gagal jaringan, dan sesi habis. Pastikan pesan sesuai hasil nyata, muncul di route yang benar, dan tidak terulang saat refresh.
- Pada check-in dan master, pastikan hasil penting tetap terlihat setelah toast hilang; timeout dan konflik tidak pernah dilabeli sukses sebelum verifikasi.
- Uji dengan keyboard, pembaca layar, dan `prefers-reduced-motion`; periksa pengumuman live region, urutan fokus, tombol tutup, serta kontras pada setiap keadaan.
- Tinjau ponsel sempit dan desktop: CTA, filter, notifikasi, dan pesan error tetap terbaca tanpa menutupi elemen lain.
- Bandingkan implementasi dengan `UI-01`–`UI-08`, `FR-*`, dan [kriteria penerimaan](../04-product-management/02-rencana-dan-penerimaan.md). Catat perbedaan keputusan di docs sebelum mengubah perilaku.
