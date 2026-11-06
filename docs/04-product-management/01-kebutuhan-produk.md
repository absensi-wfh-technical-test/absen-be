# 01 — Kebutuhan Produk (PRD)

## Ringkasan produk

**Produk:** aplikasi web absensi WFH dan monitoring karyawan. **Masalah:** bukti kehadiran WFH perlu dicatat dengan waktu dan foto, sementara HRD perlu memelihara data karyawan dan memantau absensi. **Hasil yang diharapkan:** alur singkat bagi karyawan untuk check-in, serta informasi yang dapat dicari dan diverifikasi oleh HRD. Dokumen tes menetapkan dua use case ini; riwayat pribadi, filter, dan kualitas pengalaman di bawah adalah **[Rancangan]** untuk membuat produk utuh.

**Arsitektur MVP [Keputusan]:** dua proses NestJS, yaitu modular HTTP API untuk JWT/master/upload dan Attendance Microservice untuk aturan serta baca/tulis absensi melalui TCP. Keduanya memakai satu MySQL bersama. React hanya memanggil HTTP API. Ini kebutuhan delivery internal yang dicatat pada handoff arsitektur 5 November 2026, bukan rincian yang diwajibkan secara eksplisit oleh PDF.

## Pengguna sasaran dan kebutuhan

| Persona operasional | Kondisi penggunaan | Kebutuhan utama | Risiko UX |
| --- | --- | --- | --- |
| Karyawan WFH | Sering memakai browser ponsel sebelum/selama mulai kerja. | Login mudah, unggah foto cepat, kepastian waktu tercatat. | Upload lambat, tombol terkirim ganda, kebingungan apakah sudah absen. |
| Admin HRD | Sering memakai desktop untuk mengelola banyak karyawan. | Form data master yang jelas, pencarian/filter absensi, bukti foto dapat dibuka. | Salah memperbarui profil, hasil filter tidak jelas, foto tidak bisa diakses. |

**Janji pengalaman:** tindakan utama terlihat jelas, hasil tindakan selalu dinyatakan, dan kesalahan memberi langkah pemulihan. Hindari membuat pengguna menyimpulkan status hanya dari tombol yang hilang.

## Tujuan, ukuran keberhasilan, dan batas

| Tujuan | Ukuran penerimaan MVP | Catatan |
| --- | --- | --- |
| Check-in dapat dipakai end-to-end. | Akun karyawan aktif bisa login, kirim foto valid, lalu melihat tanggal dan jam yang tersimpan. | Uji manual + integrasi; bukan KPI produksi. |
| Integritas absensi. | Dua pengiriman pada tanggal bisnis yang sama menghasilkan satu record; HRD tidak bisa mengubahnya. | Unique DB + otorisasi API. |
| Monitoring HRD. | HRD dapat mencari/filter, melihat detail dan foto, termasuk data hari ini. | Dataset uji lebih dari satu karyawan/tanggal. |
| Pengelolaan master. | HRD dapat membuat, mengubah, dan menonaktifkan karyawan; histori tetap ada. | Seed master dan akun HRD dibutuhkan. |
| Kejelasan UI. | Semua layar inti memiliki loading, kosong, error, berhasil, dan akses ditolak yang relevan. | Pemeriksaan manual responsif dan keyboard. |
| Integrasi dua proses. | HTTP API dan Attendance Microservice dapat dijalankan terpisah; check-in dan monitoring berjalan melalui TCP; auth/master tetap dapat dipakai saat service attendance mati. | Ini syarat arsitektur MVP, belum terimplementasi. |

Tidak ada target adopsi, kecepatan, atau SLA resmi dari PDF. Target operasional di arsitektur adalah rancangan yang dapat diuji, bukan komitmen eksternal.

## Kebutuhan fungsional

| ID | Kebutuhan | Sumber | Use case | Prioritas |
| --- | --- | --- | --- | --- |
| FR-01 | Akun aktif dapat login; peran menentukan akses. | **[Tes]** login; **[Skema]** user/role | UC-01 | P0 |
| FR-02 | HRD membuat akun + profil karyawan dengan departemen/jabatan. | **[Tes]** tambah master; **[Skema]** relasi wajib | UC-04 | P0 |
| FR-03 | HRD memperbarui profil karyawan. | **[Tes]** update master | UC-04 | P0 |
| FR-04 | Karyawan check-in dengan foto melalui HTTP API; Attendance Microservice mencatat tanggal dan waktu server. | **[Tes]** perilaku; **[Keputusan]** pembagian proses | UC-02 | P0 |
| FR-05 | HRD melihat daftar/detail absensi dan foto melalui HTTP API/TCP tanpa akses mutasi. | **[Tes]** view only; **[Keputusan]** transport | UC-05 | P0 |
| FR-06 | Pengiriman ganda pada hari yang sama ditolak dengan pesan jelas. | **[Skema]** unique; **[Rancangan]** UX | UC-02 | P0 |
| FR-07 | Karyawan melihat status hari ini dan riwayat miliknya. | **[Rancangan]** | UC-03 | P1 |
| FR-08 | HRD mencari/filter daftar karyawan dan absensi. | **[Rancangan]** | UC-04/05 | P1 |
| FR-09 | HRD menonaktifkan akun dan profil tanpa menghapus histori. | **[Skema]** active + FK Restrict; **[Rancangan]** | UC-04 | P1 |
| FR-10 | Sistem menyediakan master departemen/jabatan aktif untuk form. | **[Skema]** | UC-04 | P1 |
| FR-11 | HTTP API dan Attendance Microservice berkomunikasi request-response via Nest TCP dengan timeout/error terpetakan. | **[Keputusan]** handoff arsitektur | UC-02/03/05 | P0 |
| FR-12 | Karyawan dapat mengganti foto absensi miliknya pada tanggal bisnis yang sama tanpa mengubah waktu/tanggal check-in. | **[Keputusan proyek]** CRUD API; bukan use case eksplisit PDF | UC-06 | P1 |
| FR-13 | Karyawan dapat menghapus absensi miliknya pada tanggal bisnis yang sama dan check-in ulang. HRD tetap baca saja. | **[Keputusan proyek]** CRUD API; bukan use case eksplisit PDF | UC-06 | P1 |

`P0` wajib agar tes utama dapat didemonstrasikan. `P1` melengkapi pengalaman dan kualitas data; jika jadwal sangat sempit, prioritasnya setelah semua P0 dan kontrol keamanan dasar. Fitur di luar lingkup tercantum pada [analisis bisnis](../01-business-analysis/01-konteks-dan-lingkup.md#lingkup-mvp).

**Status audit awal 6 November 2026:** FR-01 pada login dan identitas dasar sudah memiliki implementasi, sementara FR-02–FR-13 belum selesai saat audit. Implementasi domain dan verifikasi lokal sesudah audit dicatat di [planning dan bukti](../06-implementation-planning/07-implementation-progress.md); status awal ini dipertahankan sebagai baseline historis.

## Perjalanan pengguna utama

### Karyawan

Masuk → melihat status hari ini → memilih foto → meninjau foto → mengirim → melihat konfirmasi tanggal/jam → dapat membuka riwayat. Jika sudah check-in, halaman langsung menunjukkan catatan yang ada. Jika upload gagal, foto yang dipilih tetap ada selama sesi layar dan pengguna dapat mencoba lagi setelah memeriksa status.

### HRD

Masuk → daftar karyawan → tambah/ubah profil → daftar absensi → filter tanggal/karyawan/departemen → buka detail dan foto. Tindakan pengelolaan karyawan memerlukan umpan balik berhasil/gagal; bagian absensi tidak menawarkan edit/hapus.

## Ketergantungan produk

- Akun HRD awal dan role seed harus tersedia sebelum pengelolaan karyawan dapat dipakai.
- Departemen/jabatan aktif harus tersedia sebelum pembuatan employee.
- Storage foto lokal privat pada HTTP API dan endpoint baca berizin perlu siap sebelum demo absensi dapat dinilai lengkap. `photoPath` diteruskan ke microservice, bukan URL publik.
- Keputusan tanggal bisnis dan kebijakan foto memengaruhi backend, database, dan teks antarmuka.
- Dua proses, kontrak TCP, shared DB, dan timeout merupakan bagian dari keputusan MVP; lihat [ADR-02](../02-solution-architecture/01-arsitektur-solusi.md#keputusan-arsitektur-adr-ringkas). Nama aplikasi/script pnpm final masih perlu ditetapkan saat implementasi.

## Asumsi dan keputusan terbuka

Asumsi kerja D-01–D-06 ada di [indeks docs](../README.md#keputusan-yang-perlu-dikunci-sebelum-coding). D-06 sudah diputuskan: satu Attendance Microservice nyata dengan shared database untuk MVP. Keputusan yang masih terbuka terutama aturan jam/hari absensi, detail file serving, dan bentuk penghapusan master karyawan. Bila tidak ada arahan baru, MVP memakai asumsi yang tercatat dan menjelaskan batasnya saat demo.
