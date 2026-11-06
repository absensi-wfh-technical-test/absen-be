# Current State Audit dan Gap Analysis

Audit source dan dokumen dilakukan 6 November 2026. Sumber assessment adalah [PDF satu halaman](../%2850%29%20Dexa%20Group%20-%20Fullstack%20Web%20Technical%20Test.pdf). Status: **Completed** = perilaku dan tes relevan lulus; **Partially Implemented** = ada bagian kode; **Not Implemented** = alur tidak ada; **Needs Verification** = kode ada tetapi bukti runtime kurang; **Blocked** = prasyarat lingkungan menghalangi verifikasi.

| Area | Status | Bukti saat audit | Gap / dependency |
| --- | --- | --- | --- |
| React/Vite, NestJS HTTP, alias `@/` | Completed untuk fondasi | `pnpm build`/`pnpm lint` kedua proyek lulus | Layar domain belum tersedia. |
| Enam tabel, migrasi, seed | Needs Verification | `schema.prisma`, migrasi awal, `prisma/seed.ts` ada | MySQL `localhost:3306` tidak aktif saat audit; constraint dan setup bersih belum diuji. |
| Login/logout, JWT, proof P-256 | Needs Verification | Controller/guard, FE login, 10 unit test lulus; smoke test tersedia | Uji ulang langsung DB dan notifikasi UI. |
| Master karyawan/lookup | Not Implemented | Hanya skema/seed dan placeholder React | API, transaksi, RBAC, form, filter. |
| Attendance Service | Not Implemented | `nest-cli.json` hanya satu entrypoint API | Proses Nest TCP kedua, kontrak, error/timeout. |
| Check-in, foto, riwayat, monitoring | Not Implemented | Halaman setelah login adalah placeholder | Seluruh API/FE/foto/integrasi. |
| E2E starter | Blocked | `pnpm test:e2e` gagal: MySQL localhost:3306 tak terhubung | Sediakan MySQL sebelum klaim integrasi lulus. |

## Temuan konsistensi dokumentasi

1. Dokumen bisnis/data masih menyebut seed atau nilai role belum ada; `prisma/seed.ts` sudah membuat role/master/akun demo.
2. Dokumen arsitektur/data menyebut output Prisma Client `../src/generated/prisma`; schema aktual memakai generator default `@prisma/client`.
3. Tabel opsi pada evaluasi signature masih menyebut pilihan A sebagai rekomendasi dan C di luar MVP, padahal C telah dipilih dan diterapkan pada auth. Domain endpoint dan multipart belum dilindungi.
4. Matriks hak akses, kontrak API, dan UX saat ini melarang semua mutasi attendance. Keputusan pengguna terbaru memberi pemilik hak mengganti foto/menghapus **pada hari bisnis yang sama**; HRD tetap hanya membaca.
5. Larangan “notifikasi” pada lingkup bisnis berarti kanal eksternal/push/email; toast umpan balik di aplikasi sudah dirancang.
6. `absen-be/README.md` dan `absen-fe/README.md` masih mengandung boilerplate starter. Seed menyimpan password demo tetap dalam source; setup reviewer dan higienitas kredensial perlu dirapikan.
7. PDF menyebut objective API CRUD, sedangkan master employee tidak boleh dihapus fisik. CRUD akan dibuktikan pada attendance milik karyawan sesuai keputusan baru, tanpa memberi HRD hak mutasi attendance.

Pekerjaan ditelusuri di [matriks requirement](02-requirements-traceability.md) dan [backlog](03-roadmap-and-backlog.md). Tidak ada klaim DB runtime selesai sampai pengujian pada MySQL nyata lulus.
