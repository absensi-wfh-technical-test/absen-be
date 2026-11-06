# Dokumentasi Produk Absensi WFH

Dokumentasi ini adalah acuan implementasi aplikasi absensi WFH dan monitoring karyawan. Baca berurutan dari kebutuhan bisnis hingga spesifikasi antarmuka. Sumber kebutuhan adalah [PDF *Dexa Group - Fullstack Web Technical Test*](%2850%29%20Dexa%20Group%20-%20Fullstack%20Web%20Technical%20Test.pdf) dan keputusan arsitektur dicatat pada handoff 5 November 2026. Berkas handoff tidak tersedia di workspace saat ini. Sumber kebenaran struktur data adalah [`schema.prisma`](../absen-be/prisma/schema.prisma) dan migrasi awal di `../absen-be/prisma/migrations/`.

## Aturan kerja sebelum implementasi

Sebelum mengerjakan fitur, baca dokumen bisnis, arsitektur, data, produk, dan UI/UX yang berkaitan. Implementasi mengikuti keputusan dan kontrak yang tertulis. Jika keputusan berubah, perbarui dokumen terkait **lebih dahulu**, jelaskan dampaknya pada kontrak atau skema, lalu selaraskan kode dan pengujian. Dokumen berstatus **[Rancangan]** bukan bukti fitur sudah tersedia; verifikasi keadaan source sebelum mengklaim implementasi selesai.

## Status pernyataan

| Penanda | Arti |
| --- | --- |
| **[Tes]** | Tertulis dalam PDF penugasan. |
| **[Skema]** | Sudah direpresentasikan oleh Prisma schema/migrasi, tetapi belum berarti fitur aplikasinya selesai. |
| **[Keputusan]** | Pilihan arsitektur MVP yang sudah disepakati dalam handoff; implementasinya belum tentu ada. |
| **[Rancangan]** | Keputusan desain untuk memandu implementasi; boleh direvisi secara sadar. |
| **[Konfirmasi]** | Belum diputuskan oleh pemberi tugas; gunakan asumsi rancangan sampai ada arahan lain. |

**Arsitektur target [Keputusan]:** hybrid architecture, yaitu modular HTTP API NestJS `:3000` + satu Attendance Microservice NestJS TCP `:3001`, dua proses, dengan shared database MySQL untuk MVP. React/Vite `:5173` hanya memanggil HTTP API. API mengelola auth/master dan upload foto lokal; microservice mengelola operasi attendance melalui `ClientProxy.send()`/`@MessagePattern()`.

**Status implementasi aktual (6 November 2026, setelah fase implementasi):** Prisma 6.19.0, migrasi enam tabel, seed berbasis env, login/logout dan proof P-256, endpoint master, Attendance Microservice TCP terpisah, upload foto privat, serta layar React `UI-01`–`UI-08` telah memiliki implementasi. Build/lint kedua aplikasi, 18 unit test backend, 5 tes navigasi/dialog frontend, e2e starter, smoke domain API/DB/TCP, dan uji layanan TCP mati lulus pada lingkungan lokal. Status bukti dan gap yang masih terbuka ada di [implementation progress](06-implementation-planning/07-implementation-progress.md); keberadaan source bukan klaim seluruh acceptance criteria telah lulus.

## Peta dokumen

1. **Analisis bisnis**: [konteks, aktor, lingkup](01-business-analysis/01-konteks-dan-lingkup.md), [aturan bisnis dan use case](01-business-analysis/02-aturan-bisnis-dan-use-case.md).
2. **Arsitektur solusi**: [komponen dan keputusan arsitektur](02-solution-architecture/01-arsitektur-solusi.md), [kontrak API dan keamanan](02-solution-architecture/02-kontrak-api-dan-keamanan.md), [arsitektur frontend React](02-solution-architecture/03-arsitektur-frontend.md), [evaluasi signature request](02-solution-architecture/04-evaluasi-signature-request.md).
3. **Arsitektur data**: [model dan kamus data](03-data-architecture/01-model-dan-kamus-data.md), [integritas, migrasi, dan kebijakan data](03-data-architecture/02-integritas-dan-siklus-data.md).
4. **Manajemen produk**: [kebutuhan produk dan prioritas](04-product-management/01-kebutuhan-produk.md), [rencana kerja dan kriteria penerimaan](04-product-management/02-rencana-dan-penerimaan.md).
5. **Desain UI/UX**: [navigasi dan alur pengguna](05-ui-ux-design/01-navigasi-dan-alur.md), [spesifikasi layar, visual, dan konten](05-ui-ux-design/02-spesifikasi-layar.md), [umpan balik interaksi dan sistem visual](05-ui-ux-design/03-umpan-balik-interaksi-dan-sistem-visual.md).
6. **Implementation planning**: [audit, traceability, backlog, service plan, pengujian, risiko, dan progres](06-implementation-planning/README.md).

## Hubungan antardokumen

- Aturan bisnis `BR-*` di analisis bisnis menjadi dasar validasi API, batasan data, dan kriteria penerimaan.
- Kebutuhan `FR-*` di manajemen produk ditelusuri ke use case `UC-*`, endpoint, dan layar `UI-*`.
- Bila rancangan bertentangan dengan `schema.prisma`, nyatakan gap dan lakukan keputusan perubahan skema sebelum implementasi. Jangan menganggap validasi aplikasi sudah dijamin oleh database.
- Waktu rencana 3–4 hari dan maksimal 5 hari berasal dari tes; handoff mencatat deadline **Sabtu, 7 November 2026 pukul 20.00 WIB**.

| Kebutuhan | Aturan/use case | Data | API rancangan | Layar |
| --- | --- | --- | --- | --- |
| Login dan akses peran (FR-01) | BR-01/02, UC-01 | `roles`, `users` | `/api/auth/*` di HTTP API | UI-01, UI-08 |
| Master karyawan (FR-02/03/09) | BR-08–11, UC-04 | `users`, `employees`, `departments`, `positions` | `/api/employees*`, `/api/departments`, `/api/positions` di HTTP API | UI-04, UI-05 |
| Check-in foto (FR-04/06) | BR-03–06, UC-02 | `attendances`, berkas privat | `POST /api/attendances` → TCP `attendance.create` | UI-02 |
| Riwayat sendiri (FR-07) | BR-03/12, UC-03 | `attendances` | `/api/attendances/me` → TCP `attendance.listByEmployee` | UI-03, UI-07 |
| Monitoring HRD (FR-05/08) | BR-07/12, UC-05 | `attendances` + relasi employee | `/api/attendances` → TCP `attendance.list` | UI-06, UI-07 |

## Keputusan implementasi

| ID | Topik | Usulan kerja | Dampak bila berbeda |
| --- | --- | --- | --- |
| D-01 | Zona waktu bisnis | **[Keputusan]** `Asia/Jakarta` untuk tanggal absensi; konvensi penyimpanan timestamp UTC dan konversi konsisten. | Mengubah penghitungan hari dan tampilan jam. |
| D-02 | Frekuensi absensi | Satu catatan aktif per karyawan per tanggal; sesuai unique key skema. Setelah pemilik menghapus catatan hari ini, check-in ulang diperbolehkan. | Perlu migrasi bila ada check-out atau beberapa shift. |
| D-03 | Kebijakan hari/jam | Check-in tidak dibatasi jam atau hari untuk MVP; tetap tampilkan waktunya. | Perlu aturan kalender kerja, terlambat, atau hari libur. |
| D-04 | Foto bukti | **[Keputusan]** upload dan penyimpanan lokal di HTTP API untuk MVP; **[Rancangan]** JPEG/PNG/WebP maksimum 5 MB dan akses privat melalui endpoint berizin. | Mengubah validasi, storage, dan UX unggah. |
| D-05 | Akun karyawan | HRD membuat akun dan profil karyawan dalam satu alur; kata sandi awal disampaikan secara aman di luar aplikasi. | Perlu alur undangan/reset bila metode berbeda. |
| D-06 | Batas microservices | **[Keputusan]** Dua proses: modular HTTP API + Attendance Microservice TCP; shared MySQL untuk MVP. | Perlu konfigurasi dua proses, kontrak TCP, timeout, dan koordinasi migrasi. |
| D-07 | Signature request | **[Keputusan]** React membuat kunci asimetris P-256 per sesi dan menandatangani semua request bisnis HTTP; backend mengikat public key ke JWT. Upload memakai proof `v2` atas bytes foto. [Kontrak dan batas](02-solution-architecture/04-evaluasi-signature-request.md#kontrak-yang-dipilih-untuk-endpoint-autentikasi). | Tidak ada secret signature global di browser. TCP hanya di jaringan internal dan memvalidasi payload; replay cache HTTP satu proses perlu penyimpanan bersama jika skala bertambah. |

D-01, bagian storage pada D-04, dan D-06 sudah disepakati pada handoff; D-02 juga ditopang constraint **[Skema]**. Rincian format/ukuran foto, D-03, dan D-05 tetap **[Rancangan]**.
