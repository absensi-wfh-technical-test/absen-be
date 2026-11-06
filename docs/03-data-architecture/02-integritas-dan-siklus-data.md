# 02 — Integritas, Migrasi, dan Siklus Data

## Invarian lintas lapisan

| Invarian | Dijamin skema? | Tanggung jawab aplikasi |
| --- | --- | --- |
| Email, kode employee, kode role/departemen/jabatan unik. | Ya, sesuai collation MySQL. | Normalisasi, pesan konflik yang jelas. |
| Satu absensi per employee per `attendance_date`. | Ya. | Cegah pengiriman ulang di UI; tangani `P2002`/konflik DB. |
| Absensi selalu milik employee yang login. | Tidak. | HTTP API mengambil `employeeId` dari JWT, bukan browser; microservice memvalidasi payload internal. |
| Waktu check-in berasal dari server dan tanggal konsisten zona bisnis. | Tidak. | Attendance Microservice memakai satu fungsi waktu terpusat; tes dekat tengah malam. |
| Akun/employee/departemen/jabatan harus aktif untuk operasi tertentu. | Tidak. | Validasi sebelum create/check-in/login. |
| Foto benar-benar ada dan berformat aman. | Tidak. | Validasi media, storage privat, kompensasi kegagalan. |
| Role employee hanya untuk profil employee. | Tidak. | Validasi pada provisioning serta guard. |
| `User.isActive` dan `Employee.isActive` konsisten saat nonaktif. | Tidak. | Ubah dalam transaksi; tentukan sumber kebenaran. |

## Tanggal dan waktu

**[Keputusan]** Gunakan `Asia/Jakarta` sebagai zona tanggal bisnis. Pada check-in, Attendance Microservice menangkap satu `instant` dari jam server, menghitung `attendanceDate` dalam zona bisnis, dan menulis `checkInAt` dari instant yang sama. MySQL `DATETIME(3)` tidak menyimpan offset; dokumentasikan dan terapkan konvensi penyimpanan UTC melalui aplikasi/Prisma pada kedua proses. Saat membaca, HTTP API/frontend menampilkan waktu dalam `Asia/Jakarta`, tanpa menambahkan offset secara manual di banyak tempat. Tes batas `23:59:59` dan `00:00:00` waktu bisnis serta pengaturan timezone host yang berbeda.

## Alur tulis dan konsistensi

### Membuat karyawan

Validasi email/kode, role karyawan, departemen/jabatan aktif, dan password awal. Buat `users` dan `employees` dalam satu transaksi Prisma agar tidak muncul akun tanpa profil akibat kegagalan tengah jalan. Tangani unique conflict setelah transaksi karena dua admin dapat memakai data sama secara bersamaan. Jangan mengembalikan `password_hash`.

### Menonaktifkan karyawan

Ubah `employees.is_active` dan `users.is_active` dalam satu transaksi. Pertahankan `attendances`. Perubahan status harus diperiksa oleh guard backend, sehingga token yang belum kedaluwarsa tidak memberi akses setelah penonaktifan.

### Check-in dan foto

1. HTTP API memvalidasi JWT, role `EMPLOYEE`, status akun/profil, dan berkas.
2. HTTP API menyimpan foto dengan nama acak di storage lokal privat dan membuat `photoPath` internal.
3. HTTP API mengirim `employeeId` terverifikasi dan `photoPath` via `ClientProxy.send({ cmd: 'attendance.create' }, payload)` dengan timeout.
4. Attendance Microservice memvalidasi payload/employee, menentukan waktu server dan tanggal bisnis, lalu insert row melalui Prisma. Unique constraint (`employee_id`, `attendance_date`) tetap pengaman akhir dari race condition.
5. Pada kegagalan **pasti** (termasuk duplikasi), HTTP API menghapus foto baru. Bila cleanup gagal, catat untuk pembersihan berkas yatim. Bila upload gagal, jangan mengirim pesan TCP.
6. Pada timeout TCP, hasil insert belum tentu gagal; jangan langsung menghapus berkas. Cek status hari ini/rekonsiliasi sebelum retry atau cleanup agar row tidak menunjuk file yang sudah hilang.

Konsistensi file–DB lintas proses tidak sepenuhnya atomik. Operasi pembersihan berkala dapat membandingkan `photo_path` dengan berkas tersimpan. Jangan menghapus foto hanya berdasarkan path dari input klien. Jika Attendance Microservice mati, auth/master di HTTP API tetap tersedia, sedangkan operasi absensi mengembalikan error layanan dengan waktu tunggu terbatas.

### Ganti foto dan hapus absensi hari ini [Keputusan proyek]

Karyawan pemilik dapat mengganti foto atau menghapus record hanya pada tanggal bisnis record yang sama menurut `Asia/Jakarta`; HRD tetap baca saja. Penggantian hanya mengubah `photo_path`, bukan `check_in_at` atau `attendance_date`. Service TCP memeriksa pemilik/hari dan menulis atau menghapus row; HTTP API mengelola file. Setelah update/delete pasti berhasil, hapus foto lama. Jika unlink gagal, row tetap valid (atau sudah hilang) dan file yatim dicatat untuk rekonsiliasi. Pada timeout, baca status/detail sebelum menentukan cleanup. Delete fisik memungkinkan check-in ulang pada hari yang sama tanpa migrasi skema.

## Migrasi dan seed

Migrasi awal tersedia di `prisma/migrations/20261105152227_init`. `DATABASE_URL` menunjuk database utama dan `SHADOW_DATABASE_URL` untuk `prisma migrate dev`; isi koneksi aktual tidak dipublikasikan. `prisma migrate deploy` tidak memakai shadow DB, tetapi `prisma.config.ts` saat ini membaca kedua variabel melalui `env(...)`, sehingga setup reviewer perlu mengisinya. Prisma Client di schema memakai output default `@prisma/client`.

Urutan setup di `absen-be`: siapkan MySQL dan env dari `.env.example` → `pnpm install` → `pnpm exec prisma migrate deploy` → `pnpm exec prisma generate` → jalankan seed role `EMPLOYEE`/`ADMIN`, departemen, jabatan, dan akun demo dengan password dari `SEED_DEMO_PASSWORD` → jalankan `pnpm start:attendance:dev` dan `pnpm start:dev` pada terminal terpisah. Seed dan script dua proses tersedia; bukti setup lokal ada di [progres](../06-implementation-planning/07-implementation-progress.md). Jangan commit `.env` atau password demo.

Perubahan skema harus melalui migrasi baru dan diperiksa terhadap data lama. Pada lingkungan produksi, gunakan prosedur deploy migrasi yang sesuai; jangan menghapus database untuk “memperbaiki” perubahan. Simpan uji migrasi bersih dan uji upgrade pada salinan data representatif.

## Siklus hidup dan privasi data

- Akun/karyawan tidak aktif tetap menyimpan histori. Tidak ada hard delete dalam alur HRD MVP.
- Foto berisi data pribadi. Simpan di lokasi privat, batasi akses berdasarkan pemilik/HRD, batasi ukuran dan tipe, dan ikutkan dalam backup serta pemulihan.
- Periode retensi dan penghapusan permanen belum ditetapkan oleh PDF. Jangan menjanjikan SLA retensi tertentu sebelum keputusan organisasi.
- Karena absensi menunjuk profil terkini, perubahan nama/departemen/jabatan akan mengubah label historis saat join. Jika HRD memerlukan keadaan organisasi *pada hari absensi*, tambahkan snapshot kolom atau tabel histori melalui migrasi yang dirancang.
- Backup harus memasangkan dump DB dan berkas foto pada titik waktu yang sejalan; restore diuji dengan membuka detail absensi dan foto.

## Query dan evaluasi

Riwayat pribadi: filter `employee_id`, urut tanggal/waktu menurun, pagination. Monitoring HRD: filter rentang tanggal, employee, departemen, urut `check_in_at` menurun dengan tie-breaker `id`. Untuk filter departemen dibutuhkan join `employees`; evaluasi query plan bila dataset membesar. `total` pagination dapat menambah biaya, sehingga ukur bila perlu. Hindari mengirim `photo_path`, `password_hash`, atau relasi internal berlebihan ke frontend.

## Gap yang dapat memicu perubahan skema

| Permintaan baru | Perubahan yang mungkin diperlukan |
| --- | --- |
| Check-out atau lebih dari satu shift per hari | Kolom/tabel per sesi; revisi unique key harian. |
| Persetujuan HRD | Status, aktor approver, timestamp, histori. |
| Audit perubahan master | Tabel audit terpisah dan kebijakan retensi. |
| Token refresh/revocation server-side | Tabel sesi/refresh token. |
| Historis departemen/jabatan saat absensi | Snapshot atau tabel assignment efektif. |
| Database-per-service atau microservices independen secara data | Pemisahan kepemilikan data fisik dan penghapusan FK lintas database; bukan bagian dari hybrid MVP yang disepakati. |
