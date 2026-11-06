# Requirements Traceability Matrix

`DG-*` memetakan setiap butir objektif/use case eksplisit pada [PDF assessment](../%2850%29%20Dexa%20Group%20-%20Fullstack%20Web%20Technical%20Test.pdf). Tenggat di PDF adalah konteks penugasan historis, bukan pengganti bukti teknis. `FR/AC` tambahan adalah keputusan proyek, bukan kutipan PDF. Kode bukti `EV-*` dijelaskan di [progres](07-implementation-progress.md).

| PDF ID | Kewajiban PDF | Jejak dokumen | Implementasi aktual | Task | Bukti dan status 6 Nov 2026 |
| --- | --- | --- | --- | --- | --- |
| DG-01 | Backend JavaScript/TypeScript + NestJS | solusi, T-01 | `absen-be/src/main.ts`, `src/attendance-service/main.ts` | IMP-006/011 | EV-01/05/06; **Verified lokal** |
| DG-02 | Struktur database tepat | data, T-02/K-04 | `absen-be/prisma/schema.prisma`, migrasi enam tabel | IMP-004 | EV-03/05/10 pada database terprovision; **Verified lokal**. Uji database kosong dikecualikan atas keputusan pengguna. |
| DG-03 | Koneksi ke database | data, T-02 | Prisma dan `/health/database` | IMP-004 | EV-04/05; **Verified lokal** |
| DG-04 | API dengan konsep microservices | FR-11, AC-13/14, T-09 | HTTP `src/attendances` + Nest TCP `src/attendance-service` | IMP-011–014 | EV-05/06; **Verified lokal** |
| DG-05 | API manipulasi data CRUD | FR-04/07/12/13, AC-06/15/16, T-02 | `AttendancesController` + `AttendanceService` | IMP-012–019 | EV-05 create/read/replace/delete milik sendiri; **Verified lokal**. HRD hanya GET |
| DG-06 | Frontend web React | frontend, T-01 | `absen-fe/src` | IMP-009/019/021 | EV-02/08; **Verified lokal** |
| DG-07 | Page/screen frontend | UI-01–08, T-08 | `src/features/{auth,attendance,employees}/pages` | IMP-009/019/021/022 | EV-02/08/14/15; **Partially Verified**, alur browser penuh masih terbuka |
| DG-08 | Frontend memanggil API backend | kontrak API, T-08 | `src/lib/apiClient.ts`, service per fitur | IMP-009/019/021 | EV-08 untuk auth, form create, upload, replace, monitoring; **Verified lokal** untuk alur inti |
| DG-09 | Komponen frontend kustom | frontend, T-08 | form, toast, foto, cards, layout | IMP-009/019/022 | EV-02/08; **Verified lokal** untuk keberadaan/routing |
| DG-10 | Login karyawan | FR-01, AC-01/02, T-03 | `AuthModule`, `features/auth` | IMP-005 | EV-05/07/08; **Verified lokal**, termasuk penolakan akun nonaktif |
| DG-11 | Absen tanggal, waktu, foto WFH | FR-04/06, AC-06–08, T-06 | service WIB, upload storage, UI-02 | IMP-012/016–019 | EV-05 API/DB/TCP dan EV-08 browser upload; **Verified lokal** |
| DG-12 | HRD menambah/memperbarui karyawan | FR-02/03, AC-04/05, T-05 | `EmployeesModule`, UI-04/05 | IMP-007–010 | EV-05 API create/update, EV-08 browser create, EV-16 browser update/konflik; **Verified lokal** |
| DG-13 | HRD memonitor absensi baca saja | FR-05, AC-09/14, T-07 | list/detail/foto GET, UI-06/07 | IMP-013/021 | EV-05 role/list API dan EV-08 browser data/foto/detail; **Verified lokal** |

| Requirement tambahan proyek | Implementasi | Bukti/status |
| --- | --- | --- |
| FR-07/08/09/10; AC-10/11/12 | Riwayat pribadi, filter, nonaktifkan, lookup, keadaan UI | EV-05 API; EV-08/14/15 sebagian UI termasuk filter kosong dan 503; verifikasi browser lengkap terbuka. |
| FR-12/13; BR-14/15; AC-15/16 | Ubah foto/hapus absensi pemilik hari yang sama | EV-05 API/DB/TCP, termasuk waktu asli dan recheck-in; browser belum diuji. |
| Signature P-256 v1/v2, foto privat | Guard auth/domain, hash bytes foto, storage privat | EV-01/05/07; pre-request Postman lulus simulasi proof EV-09, belum dijalankan di aplikasi Postman. |
| Setup/penyerahan | README mandiri di masing-masing repo, env contoh, Postman, checklist | EV-09; uji database kosong dikecualikan atas keputusan pengguna, koleksi Postman aktual belum diuji. |

Status seluruh `DG-*` yang **Partially Verified** atau **Needs Verification** tetap terbuka pada gerbang penyerahan walaupun source sudah ditulis.

## Jejak rinci requirement dan acceptance criteria

Status **API lulus; UI terbuka** berarti source UI tersedia, tetapi aksi terkait belum didemokan melalui browser. `BR-*` berasal dari [aturan bisnis](../01-business-analysis/02-aturan-bisnis-dan-use-case.md), `UI-*` dari [spesifikasi layar](../05-ui-ux-design/02-spesifikasi-layar.md).

| ID | DG / BR / UI | Task | Bukti | Status |
| --- | --- | --- | --- | --- |
| FR-01 | DG-10; BR-01–03; UI-01 | IMP-005/023 | EV-05/07/08 | Login/role lulus lokal |
| FR-02 | DG-12; BR-08/10/11; UI-05 | IMP-007–009 | EV-05/08 | API dan UI create lulus lokal |
| FR-03 | DG-12; BR-08/10/11; UI-05 | IMP-008/009 | EV-05/16 | API dan UI update tersimpan lulus lokal |
| FR-04 | DG-11; BR-04/05; UI-02 | IMP-012/016–019 | EV-05/08 | API dan UI upload lulus lokal |
| FR-05 | DG-13; BR-07/12; UI-06/07 | IMP-013/021 | EV-05/08 | API dan UI data/foto terisi lulus lokal |
| FR-06 | DG-11; BR-06; UI-02 | IMP-012/019 | EV-01/05 | API race lulus; UI konflik terbuka |
| FR-07 | DG-07/08; BR-03; UI-02/03/07 | IMP-013/019/020 | EV-05/08 | API dan detail pribadi browser lulus; pagination banyak halaman terbuka |
| FR-08 | DG-07/12/13; BR-07; UI-04/06 | IMP-010/013/021 | EV-05/08/14 | API filter, monitoring terisi, dan master tanpa hasil lulus; pagination UI banyak halaman terbuka |
| FR-09 | DG-12; BR-02/09; UI-05 | IMP-008/010 | EV-05/08 | API dan UI konfirmasi/nonaktif lulus lokal |
| FR-10 | DG-12; BR-11; UI-05 | IMP-007/009 | EV-05/08 | Lookup dan validasi lulus lokal |
| FR-11 | DG-04; BR-05/07; UI-08 | IMP-011–014 | EV-05/06 | TCP dan service mati lulus; timeout pascacommit terbuka |
| FR-12 | DG-05; BR-14; UI-02/07 | IMP-015/019 | EV-05/08 | API dan UI ganti foto lulus lokal |
| FR-13 | DG-05; BR-15; UI-02/07 | IMP-015/019 | EV-05 | API lulus; UI hapus terbuka |
| AC-01 | DG-10; BR-01; UI-01 | IMP-005/023 | EV-05/07/08 | Lulus lokal |
| AC-02 | DG-10; BR-02; UI-01 | IMP-005/023 | EV-05/07/08 | Login nonaktif dan pesan UI lulus lokal |
| AC-03 | DG-10/12; BR-03; UI-08 | IMP-008/023 | EV-05 | Lulus API |
| AC-04 | DG-12; BR-10/11; UI-05 | IMP-008/009 | EV-05/08 | API dan submit UI lulus lokal |
| AC-05 | DG-12; BR-10/11; UI-05 | IMP-008/009 | EV-05/16 | Rollback/konflik lulus API; konflik email tampil dekat field di UI |
| AC-06 | DG-11; BR-03–06; UI-02 | IMP-012/016/019 | EV-05/08 | API/DB/TCP dan UI upload lulus lokal |
| AC-07 | DG-11; BR-06; UI-02 | IMP-012/016 | EV-05 | Race dan cleanup lulus lokal |
| AC-08 | DG-11; BR-04; UI-02 | IMP-016/019 | EV-01/05 | Foto invalid/besar lulus API |
| AC-09 | DG-13; BR-07; UI-06/07 | IMP-013/021 | EV-05/08 | API dan UI data terisi lulus lokal |
| AC-10 | DG-11; BR-03/12; UI-07 | IMP-013/018 | EV-05 | Lulus API |
| AC-11 | DG-12; BR-02/09; UI-05 | IMP-008/010 | EV-05/08 | Penonaktifan browser, login ditolak, histori tetap tersedia |
| AC-12 | DG-07; BR-07; UI-03/04/06 | IMP-020–022 | EV-08/14/15 | Riwayat kosong, filter master kosong, dan 503 monitoring lulus; variasi lain terbuka |
| AC-13 | DG-04; BR-05; UI-08 | IMP-014/018/023 | EV-06/13/15 | Service mati dan UI 503 lulus; timeout pascacommit terbuka |
| AC-14 | DG-04/13; BR-07; UI-06 | IMP-011/014/021 | EV-05/06/08 | TCP, read-only API, dan UI data terisi lulus lokal |
| AC-15 | DG-05; BR-14; UI-02/07 | IMP-015/018/019 | EV-05/08 | API/DB/foto dan UI replace lulus lokal |
| AC-16 | DG-05; BR-15; UI-02/07 | IMP-015/018/019 | EV-05 | API/DB/foto lulus; UI terbuka |

