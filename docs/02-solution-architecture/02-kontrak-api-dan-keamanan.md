# 02 — Kontrak API dan Keamanan

Dokumen ini adalah **kontrak target**; endpoint autentikasi sudah tersedia, sedangkan endpoint master/absensi masih rancangan. Prefix `/api` mengikuti keputusan arsitektur yang dicatat pada handoff 5 November 2026. React hanya memanggil HTTP API `:3000` (atau `/api` melalui Vite dev proxy); port TCP `:3001` tidak memiliki REST endpoint publik. Perubahan kontrak harus diterapkan konsisten pada backend, frontend, dan kriteria penerimaan.

## Konvensi umum

- JSON memakai `camelCase`; tanggal bisnis `YYYY-MM-DD`; timestamp ISO 8601 dengan offset/UTC. Tampilkan jam ke pengguna dengan zona bisnis.
- `employeeId` berasal dari JWT yang diverifikasi HTTP API; `checkInAt` dan `attendanceDate` ditentukan Attendance Microservice dari waktu server. Browser tidak mengirim nilai tersebut sebagai sumber kebenaran.
- Request JSON wajib `Content-Type: application/json`; foto memakai `multipart/form-data` dengan field `photo`.
- Autentikasi: JWT pada `Authorization: Bearer <accessToken>`; masa hidup 30 menit dan penyimpanan dalam memori React. Login ulang sesudah kedaluwarsa. Jangan simpan token di `localStorage`/`sessionStorage`. `JWT_SECRET` wajib disiapkan di env backend (minimal 32 byte); token yang diterbitkan sebelum restart/rotasi secret tidak lagi berlaku.
- Respons error: `{ "error": { "code": "ATTENDANCE_ALREADY_EXISTS", "message": "Anda sudah absen hari ini.", "details": {} }, "requestId": "..." }`. `details` hanya untuk pesan validasi yang aman.
- List memakai `page` (mulai 1), `pageSize` (batas maksimum 50), dan `{ data: [], meta: { page, pageSize, total } }` dengan pengurutan stabil.

**Signature request [Keputusan proyek]:** Auth memakai proof ECDSA P-256 `v1` sesuai [kontrak signature](04-evaluasi-signature-request.md#kontrak-yang-dipilih-untuk-endpoint-autentikasi). Semua endpoint bisnis HTTP baru juga wajib proof kunci yang sama; JSON/tanpa body memakai `v1`, sedangkan upload foto memakai kontrak `v2` pada dokumen signature. Public key per sesi dikirim browser; private key hanya di memori browser dan thumbprint public key diikat pada JWT. Backend memakai timestamp yang dikirim untuk verifikasi signature, sedangkan jam server hanya memeriksa batas kesegaran. Tidak ada HMAC global di React. Endpoint health adalah diagnostik internal, bukan endpoint bisnis publik.

## Endpoint MVP

| Method | Path | Role | Tujuan / hasil |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Publik | AuthModule lokal: email + password → JWT, pengguna dan role. |
| GET | `/api/auth/me` | Semua login | AuthModule lokal: identitas dan profil terkait. |
| POST | `/api/auth/logout` | Semua login | Frontend membuang token; 204, tanpa klaim revocation server-side. |
| GET | `/api/departments` | Authorized | DepartmentsModule lokal: master aktif untuk form. |
| GET | `/api/positions` | Authorized | PositionsModule lokal: master aktif untuk form. |
| GET | `/api/employees` | ADMIN | EmployeesModule lokal: cari/filter/pagination. |
| POST | `/api/employees` | ADMIN | EmployeesModule lokal: buat `User` + `Employee` atomik; `201`. |
| GET | `/api/employees/:id` | ADMIN | EmployeesModule lokal: detail tanpa hash. |
| PATCH | `/api/employees/:id` | ADMIN | EmployeesModule lokal: ubah profil; `200`. |
| PATCH | `/api/employees/:id/status` | ADMIN | EmployeesModule lokal: aktif/nonaktifkan akun dan profil. |
| POST | `/api/attendances` | EMPLOYEE | Upload foto di HTTP API → TCP `attendance.create`; `201`/`409`. |
| GET | `/api/attendances/me` | EMPLOYEE | TCP `attendance.listByEmployee`; riwayat pribadi. |
| GET | `/api/attendances` | ADMIN | TCP `attendance.list`; monitoring baca saja. |
| GET | `/api/attendances/me/today` | EMPLOYEE | Ekstensi rancangan: TCP `attendance.today`; status hari ini. |
| GET | `/api/attendances/:id` | Pemilik/ADMIN | Ekstensi rancangan: TCP `attendance.getById`; detail. |
| GET | `/api/attendances/:id/photo` | Pemilik/ADMIN | Metadata via TCP, lalu HTTP API stream foto privat. |
| PATCH | `/api/attendances/:id/photo` | EMPLOYEE pemilik, hari bisnis yang sama | Ganti foto saja melalui TCP `attendance.replacePhoto`; tanggal/jam asli tetap. |
| DELETE | `/api/attendances/:id` | EMPLOYEE pemilik, hari bisnis yang sama | TCP `attendance.deleteOwn`, lalu cleanup foto; `204`. Check-in ulang hari itu diperbolehkan. |

Tiga message pattern `attendance.create`, `attendance.listByEmployee`, dan `attendance.list` berasal dari handoff. `attendance.today` dan `attendance.getById` adalah ekstensi untuk layar status/detail; `attendance.replacePhoto` dan `attendance.deleteOwn` adalah keputusan proyek setelah audit untuk membuktikan CRUD tanpa menghapus employee. Routing statis `/me` didaftarkan sebelum `/:id`. Tidak ada endpoint mutasi attendance untuk ADMIN. `DELETE /api/employees` tidak ada karena FK `Restrict` dan kebutuhan menjaga histori; employee dinonaktifkan.

## Kontrak TCP internal

| Pattern `cmd` | Pengirim → penerima | Payload minimum terverifikasi | Hasil |
| --- | --- | --- | --- |
| `attendance.create` | Proxy → microservice | `employeeId`, `photoPath`, `requestId` | `id`, `employeeId`, `attendanceDate`, `checkInAt` atau error domain. |
| `attendance.listByEmployee` | Proxy → microservice | `employeeId`, filter/pagination tervalidasi | Daftar milik employee. |
| `attendance.list` | Proxy → microservice | Filter tanggal/karyawan/departemen, pagination | Daftar monitoring ADMIN. |
| `attendance.today` | Proxy → microservice | `employeeId` | Absensi tanggal bisnis sekarang atau `null`. |
| `attendance.getById` | Proxy → microservice | `attendanceId`, identitas peminta/role untuk validasi | Metadata detail, termasuk referensi foto hanya untuk HTTP API. |
| `attendance.replacePhoto` | Proxy → microservice | `attendanceId`, `employeeId` dari JWT, `photoPath` baru, `requestId` | Metadata terbaru dan path lama hanya untuk cleanup internal; waktu/tanggal tetap. |
| `attendance.deleteOwn` | Proxy → microservice | `attendanceId`, `employeeId` dari JWT, `requestId` | Path foto hanya untuk cleanup internal; row dihapus. |

Microservice memvalidasi ulang bentuk payload dan status employee yang diperlukan. `photoPath` adalah nilai internal yang dibuat HTTP API, bukan data browser. HTTP API memetakan error domain/TCP ke respons HTTP yang stabil; jangan membiarkan pesan internal/stack trace keluar.

## Payload penting

### Login

```json
{ "email": "pegawai@example.test", "password": "kata-sandi" }
```

Respons hanya berisi data publik yang diperlukan UI: `accessToken`, `expiresIn`, `user: { id, email, roleCode, employeeId?, fullName? }`. `passwordHash` tidak pernah keluar dari API.

### Buat karyawan

```json
{
  "employeeCode": "EMP-001",
  "fullName": "Nama Karyawan",
  "email": "pegawai@example.test",
  "initialPassword": "kata-sandi-awal",
  "departmentId": 1,
  "positionId": 1,
  "phoneNumber": null,
  "hireDate": "2026-11-05"
}
```

`initialPassword` dipakai satu kali untuk menghasilkan hash dan tidak dikembalikan. `hireDate` adalah tanggal, bukan timestamp. Tindakan HRD yang membuat akun awal harus memiliki prosedur penyampaian kredensial aman; fitur email undangan tidak termasuk MVP.

### Check-in

Form-data hanya `photo`; HTTP API memvalidasi dan menyimpan berkas lokal, lalu mengirim `employeeId` dan `photoPath` melalui `attendance.create`. Microservice menentukan timestamp/tanggal dan menulis row. Respons HTTP berisi `id`, `attendanceDate`, `checkInAt`, `employeeId`, `photoAvailable`, tanpa `photoPath`. Setelah timeout, UI memanggil `GET /api/attendances/me/today` sebelum mengirim ulang.

**Ganti/hapus milik sendiri [Keputusan proyek]:** `PATCH /api/attendances/:id/photo` menerima form-data `photo` saja, memvalidasi foto baru, dan mempertahankan `attendanceDate`/`checkInAt`. `DELETE /api/attendances/:id` tidak menerima body dan menghapus row setelah konfirmasi. Keduanya hanya boleh pada tanggal bisnis record yang sama menurut jam service. Setelah hapus berhasil, karyawan boleh check-in ulang. Respons tidak mengandung path foto. Bila hasil mutasi timeout, periksa status/detail sebelum cleanup atau retry. HRD tidak diberi izin mutasi.

## Status dan kesalahan

| HTTP | Kode contoh | Situasi | Respons UI |
| --- | --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Field wajib/format tidak valid | Tampilkan pada field. |
| 401 | `UNAUTHENTICATED` | Token kosong/kedaluwarsa | Kembali ke login. |
| 401 | `SIGNATURE_INVALID` / `SIGNATURE_EXPIRED` / `SIGNATURE_REPLAYED` | Proof hilang/salah, terlalu lama, atau nonce pernah dipakai | Buat proof baru atau login ulang; jangan retry otomatis request mutasi yang hasilnya belum pasti. |
| 403 | `FORBIDDEN` | Role salah atau akses foto milik orang lain | Halaman akses ditolak. |
| 404 | `NOT_FOUND` | ID tidak ada | Detail tidak ditemukan. |
| 409 | `ATTENDANCE_ALREADY_EXISTS` | Duplikat check-in | Muat status hari ini. |
| 409 | `DUPLICATE_EMPLOYEE_CODE` / `DUPLICATE_EMAIL` | Benturan unique key | Minta koreksi field. |
| 409 | `ATTENDANCE_EDIT_WINDOW_CLOSED` | Ganti/hapus di luar tanggal bisnis record | Jelaskan absensi lama tidak dapat diubah. |
| 413 | `PHOTO_TOO_LARGE` | Foto di atas batas usulan 5 MB | Pilih foto lebih kecil. |
| 415 | `UNSUPPORTED_PHOTO_TYPE` | Bukan JPEG/PNG/WebP valid | Pilih format yang didukung. |
| 503 | `ATTENDANCE_SERVICE_UNAVAILABLE` | TCP timeout/layanan mati; hasil tulis mungkin belum pasti | Periksa status hari ini; jangan hapus foto yang mungkin sudah direferensikan. |
| 500/503 | `STORAGE_UNAVAILABLE` / `INTERNAL_ERROR` | Storage atau DB gagal | Jelaskan gagal, pertahankan input lokal jika aman. |

## Kontrol keamanan

1. Hash kata sandi memakai algoritme khusus password (misalnya Argon2id atau bcrypt dengan parameter layak), bukan hash umum. Validasi kekuatan password awal dan jangan log kredensial.
2. HTTP API memeriksa JWT, `User.isActive`, role `ADMIN`/`EMPLOYEE`, dan `Employee.isActive` untuk tindakan karyawan. Microservice juga memvalidasi identitas/status employee yang diperlukan. Perubahan status aktif harus efektif pada request berikutnya.
3. Batasi login berulang; gunakan pesan login generik agar keberadaan email tidak terungkap. Validasi dan normalisasi email/kode secara konsisten.
4. HTTP API memvalidasi foto berdasarkan *magic bytes* serta MIME, bukan ekstensi saja. Gunakan nama berkas acak, path relatif yang dikontrol server, batas ukuran, dan larang path traversal. Simpan di area nonpublik; endpoint foto memeriksa pemilik/ADMIN.
5. Batasi durasi `ClientProxy.send()`; port TCP hanya tersedia di jaringan internal. CORS hanya untuk origin frontend yang diketahui saat deploy. HTTPS untuk transport; rahasia JWT/DB dan kunci signature internal jika kelak dipakai hanya di env backend. `SHADOW_DATABASE_URL` hanya untuk migrasi, bukan request aplikasi.
6. Log `requestId`, aktor, pattern, operasi, hasil, dan durasi lintas proses tanpa token, password, isi foto, atau path rahasia. Audit persisten belum ada di skema dan tidak boleh diklaim tersedia.

## Pengujian kontrak minimum

Uji login benar/salah, JWT kedaluwarsa, akses lintas peran, akun nonaktif, unggahan invalid, dua request check-in bersamaan, filter/pagination, akses foto bukan pemilik, microservice mati/timeout, kegagalan storage/DB, cleanup/reconciliation, dan sanitasi respons. Peta penerimaan fungsional ada di [rencana produk](../04-product-management/02-rencana-dan-penerimaan.md).
