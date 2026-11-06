# Rencana Attendance Service Terpisah

Implementasi mempertahankan HTTP API saat ini di `absen-be/src` dan menambah entrypoint NestJS TCP terpisah pada `src/attendance-service`; kontrak DTO/pattern berada di `src/contracts`. Dua proses dibangun dari proyek yang sama dan memakai satu MySQL. HTTP API adalah owner auth/master/file; service TCP satu-satunya owner operasi Prisma `attendances`. Tidak perlu migrasi skema untuk create/read/ganti foto/hapus yang diputuskan.

## Jalur request dan kontrak

React → HTTP API `/api/attendances*` dengan JWT + proof P-256 → validasi/otorisasi → `ClientProxy.send()` TCP `:3001` → `@MessagePattern()` attendance → Prisma/MySQL. Browser tidak mengakses TCP atau DB. HTTP API tidak menulis tabel attendance. Pattern: `attendance.create`, `attendance.today`, `attendance.listByEmployee`, `attendance.list`, `attendance.getById`, `attendance.replacePhoto`, `attendance.deleteOwn`. Payload internal memakai `requestId`, identitas `employeeId` dari guard untuk aksi pemilik, filter yang telah divalidasi, dan `photoPath` internal bila diperlukan. Service memvalidasi ulang bentuk data, pemilik, status employee, dan tanggal bisnis.

`create`: service mengambil satu instant jam server, menghitung `attendanceDate` di `Asia/Jakarta`, menyimpan `checkInAt` UTC, menangani unique `(employeeId, attendanceDate)` sebagai konflik 409. `replacePhoto`: hanya pemilik dan tanggal bisnis yang sama; `photoPath` berubah secara kondisional, tanggal/jam asli tetap. `deleteOwn`: hanya pemilik pada tanggal bisnis yang sama; hapus fisik row, sehingga check-in baru hari itu diperbolehkan. ADMIN tidak memiliki pattern mutasi yang dapat dipanggil dari HTTP API. `list` dan `getById` untuk ADMIN tetap baca saja; respons publik tidak memuat `photoPath`.

## File, signature, dan kegagalan

Upload `POST /api/attendances` dan `PATCH /api/attendances/:id/photo` menerima tepat satu `photo` JPEG/PNG/WebP <=5 MiB. Parser membatasi ukuran dan jumlah file; server memeriksa magic bytes. Proof multipart `v2` mengikat method, path+query, timestamp, nonce, serta SHA-256 bytes foto. JWT/role diperiksa sebelum parsing; proof lengkap diverifikasi setelah parsing dan sebelum file disimpan atau TCP dipanggil. JSON/no-body tetap `v1` sesuai kontrak auth. Public key harus cocok `cnf.jkt`; nonce replay ditolak.

Saat operasi pasti gagal, file baru dihapus. Setelah ganti/hapus berhasil, file lama dibersihkan; kegagalan unlink dicatat untuk rekonsiliasi. Pada TCP timeout setelah mungkin commit, jangan hapus file baru secara langsung: baca `today`/detail, lalu rekonsiliasi. HTTP API menerapkan timeout terbatas, memetakan error domain ke HTTP 400/401/403/404/409/503, dan melog `requestId`, durasi, pattern, serta hasil tanpa token/password/path foto. Health service boleh internal; port TCP tidak diekspos ke browser.

Konfigurasi contoh: `PORT=3000`, `ATTENDANCE_TCP_HOST=127.0.0.1`, `ATTENDANCE_TCP_PORT=3001`, `PHOTO_STORAGE_DIR` privat, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`. Prisma Client dan migrasi dimiliki satu proyek; kedua proses memuat schema yang sama. Saat deploy terpisah host, storage lokal harus diganti shared/object storage melalui keputusan baru. Jalankan tes dua proses, race check-in, batas WIB, foto, pemilik salah, service mati, timeout setelah commit, dan restart. Jika DB/service belum tersedia, tandai pengujian terblokir, bukan lulus.
