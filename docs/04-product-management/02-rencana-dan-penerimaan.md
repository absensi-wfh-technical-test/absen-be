# 02 — Rencana Rilis dan Kriteria Penerimaan

## Strategi delivery

Target tes adalah 3–4 hari dengan batas maksimal 5 hari **[Tes]**. Handoff arsitektur 5 November 2026 mencatat deadline **Sabtu, 7 November 2026 pukul 20.00 WIB**. Urutan berikut adalah rencana kerja **[Rancangan]**; dengan waktu yang tersisa, tahap dapat dikerjakan beririsan, tetapi kriteria akhir tetap mencakup dua proses NestJS yang benar-benar berkomunikasi.

| Tahap | Fokus | Bukti selesai |
| --- | --- | --- |
| Fondasi | Validasi migrasi/seed; rancang dua aplikasi NestJS, kontrak TCP, konfigurasi env/Prisma, JWT/role guard. | Role `ADMIN`/`EMPLOYEE` dapat login; dua proses dapat dijalankan; akses salah ditolak. |
| Master | Transaksi user–employee, daftar/form HRD, departemen/jabatan. | HRD tambah/ubah karyawan; validasi duplikat/relasi; karyawan baru dapat login. |
| Absensi | Upload di HTTP API, `attendance.create` via TCP, aturan tanggal WIB, unique key, cleanup. | Karyawan check-in; duplikat ditolak; foto berizin dapat dibaca; timeout ditangani. |
| Monitoring & integrasi | `attendance.list`/`listByEmployee` via TCP, detail foto, React, UX dan QA. | Alur kedua peran lengkap, responsif, dan service mati ditangani. |
| Finalisasi | Uji lintas proses, keamanan, dokumentasi setup/demo sesuai script pnpm aktual. | Build/test relevan bersih dan demo end-to-end stabil sebelum deadline. |

**Jalur kritis:** migrasi/seed → JWT/master employee → kontrak TCP + microservice → upload/check-in → monitoring React. Frontend dapat memakai kontrak/mock sementara, tetapi verifikasi akhir harus memakai API dan microservice nyata. Jika waktu tertekan, prioritaskan alur bisnis dan integrasi dua proses; jangan memotong otorisasi, constraint, atau keamanan foto untuk menambah fitur kosmetik.

## Kriteria penerimaan dalam bahasa perilaku

| ID | Skenario Given / When / Then | Terkait |
| --- | --- | --- |
| AC-01 | **Given** akun aktif, **when** email dan password benar, **then** pengguna masuk ke area sesuai role dan `/api/auth/me` mencerminkan identitasnya. | FR-01, UC-01 |
| AC-02 | **Given** kredensial salah atau akun nonaktif, **when** login, **then** akses ditolak dengan pesan aman; tidak ada token valid. | FR-01, BR-02 |
| AC-03 | **Given** sesi karyawan, **when** memanggil endpoint HRD, **then** 403 dan data HRD tidak berubah/terbaca. | FR-01, BR-03 |
| AC-04 | **Given** HRD dan master aktif, **when** membuat karyawan valid, **then** user dan employee tercipta bersama, kode/email unik, dan hash tidak muncul di respons. | FR-02, BR-10/11 |
| AC-05 | **Given** kode/email duplikat atau relasi master invalid, **when** HRD menyimpan, **then** request gagal jelas dan tidak ada user/profil parsial. | FR-02, BR-10/11 |
| AC-06 | **Given** employee aktif belum check-in hari ini, **when** mengirim foto ke HTTP API, **then** API menyimpan foto, mengirim `attendance.create` via TCP, dan microservice menyimpan satu record dengan waktu server/tanggal WIB. | FR-04/11, BR-03–06 |
| AC-07 | **Given** employee sudah check-in, **when** mengirim lagi (termasuk dua request bersamaan), **then** tepat satu record ada, konflik ditampilkan, dan foto unggahan baru dibersihkan pada kegagalan pasti. | FR-06, BR-06 |
| AC-08 | **Given** foto kosong, terlalu besar, atau tipe salah, **when** check-in, **then** request ditolak dan attendance tidak tercipta. | FR-04, BR-04 |
| AC-09 | **Given** HRD login, **when** memfilter absensi dan membuka detail, **then** data dan foto sesuai filter terlihat; tidak ada aksi edit/hapus. | FR-05/08, BR-07 |
| AC-10 | **Given** karyawan A, **when** meminta data/foto karyawan B, **then** akses ditolak tanpa membocorkan berkas. | FR-07, BR-03/12 |
| AC-11 | **Given** employee dengan histori, **when** HRD menonaktifkan, **then** login/check-in berikutnya gagal dan histori tetap terlihat bagi HRD. | FR-09, BR-02/09 |
| AC-12 | **Given** data absensi kosong atau filter tanpa hasil, **when** membuka daftar, **then** keadaan kosong menjelaskan situasi dan menawarkan langkah yang relevan. | FR-05/07/08 |
| AC-13 | **Given** Attendance Microservice berhenti/timeout, **when** pengguna meminta absensi, **then** HTTP API mengembalikan error terstruktur dalam batas waktu; login/master tetap dapat dipakai; hasil check-in yang tidak pasti diperiksa sebelum retry/cleanup. | FR-11 |
| AC-14 | **Given** dua proses NestJS hidup, **when** HRD membuka monitoring, **then** HTTP API mengirim `attendance.list` melalui TCP dan menampilkan data tanpa endpoint mutasi untuk ADMIN. | FR-05/11, BR-07 |
| AC-15 | **Given** karyawan pemilik dan absensi hari ini, **when** mengganti foto valid, **then** foto tersimpan berubah, foto lama dibersihkan setelah hasil pasti, sedangkan waktu/tanggal asli tetap. Bukan pemilik, ADMIN, atau absensi hari lampau ditolak. | FR-12, BR-14 |
| AC-16 | **Given** karyawan pemilik dan absensi hari ini, **when** mengonfirmasi hapus, **then** row dihapus, foto dibersihkan setelah hasil pasti, dan check-in ulang hari itu diperbolehkan. ADMIN, bukan pemilik, atau hari lampau ditolak. | FR-13, BR-15 |

## Matriks pengujian minimum

| Lapisan | Kasus yang memberi nilai |
| --- | --- |
| Unit/domain | Perhitungan tanggal bisnis; pemetaan hak akses; validasi ukuran/jenis foto; normalisasi input. |
| Integrasi DB | Transaksi create user + employee; unique attendance; filter dan pagination; status aktif. |
| Integrasi API/TCP | 401/403; kontrak error; upload; `ClientProxy.send`/`@MessagePattern`; akses foto pemilik/HRD; benturan dua request; timeout/service mati. |
| End-to-end | Dua proses NestJS hidup: HRD membuat employee → employee login/check-in → HRD melihat detail/foto → HRD nonaktifkan → employee ditolak. |
| UI manual | Ponsel dan desktop, keyboard, screen reader dasar, loading/empty/error, upload lambat, session expiry. |

## Definition of done per fitur

Fitur dianggap selesai bila: (1) perilaku sesuai kriteria penerimaan; (2) validasi dan otorisasi berada di HTTP API serta payload internal divalidasi microservice; (3) keberhasilan serta error tampil di UI; (4) tidak ada rahasia atau `photoPath` bocor di respons/log; (5) migrasi/seed/setup reproducible; (6) kedua proses NestJS dapat dibangun/dijalankan dan tes relevan lulus; (7) alur dapat diperagakan dengan data contoh.

## Risiko dan mitigasi

| Risiko | Dampak | Mitigasi / pemicu keputusan |
| --- | --- | --- |
| Dua proses berbagi schema MySQL. | Perubahan DB dapat mematahkan salah satu proses. | Owner operasi per tabel, koordinasi migrasi, uji kompatibilitas kedua Prisma Client. |
| Attendance Microservice tidak tersedia atau timeout setelah commit. | Fitur absensi gagal/hasil tidak pasti; potensi foto yatim atau referensi foto hilang. | Timeout terukur, cek status sebelum retry/cleanup, rekonsiliasi berkas. |
| Foto tersimpan tetapi DB gagal. | Berkas yatim. | Kompensasi hapus dan pemeriksaan berkala. |
| Waktu server/DB berbeda zona. | Tanggal absensi salah. | Satu fungsi waktu, UTC storage convention, tes batas hari. |
| Tidak ada seed role/master/HRD. | Aplikasi tidak bisa dipakai setelah migrasi. | Seed idempotent dan instruksi setup. |
| Token dicuri sebelum kedaluwarsa. | Akses tidak sah. | Masa hidup pendek, HTTPS, penyimpanan memori, cek status aktif; mekanisme revoke memerlukan model sesi tambahan. |
| Berkas foto publik atau path traversal. | Kebocoran data pribadi. | Storage privat, nama acak, endpoint baca berotorisasi, validasi MIME/magic bytes. |

## Paket demo yang harus siap

README setup, `.env.example` tanpa nilai rahasia, migrasi + seed, akun demo yang dibuat dengan cara aman, perintah pnpm **sesuai script yang nanti benar-benar ada** untuk React serta dua proses NestJS, skenario demo kedua role, dan penjelasan shared database/transport TCP. Jangan mengklaim fitur yang belum diimplementasikan hanya karena telah ada di dokumen ini.
