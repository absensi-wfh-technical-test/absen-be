# Roadmap dan Feature Backlog

Urutan mengikuti dependency nyata; `P0` adalah assessment dan arsitektur yang disepakati, `P1` adalah rancangan pelengkap yang pengguna minta dituntaskan juga. Effort relatif: S (kecil), M (sedang), L (besar). Setiap task selesai hanya jika kriteria di bawah diuji; hasil dicatat di [progres](07-implementation-progress.md).

| Fase / ID | Prioritas, effort | Pekerjaan dan dependency | Acceptance criteria / bukti |
| --- | --- | --- | --- |
| 0 / IMP-001 | P0 S | Audit PDF, source, docs; petakan DG/FR/AC/UI. | Matrix DG-01–13 lengkap, status berdasar bukti. |
| 0 / IMP-002 | P0 M | Koreksi status seed/Prisma/signature/notifikasi; tambahkan FR-12/13, BR-14/15, AC-15/16. | Kontrak, alur UX, data owner, checklist konsisten; tautan valid. |
| 0 / IMP-003 | P0 S | Tetapkan kontrak TCP/HTTP, signature multipart dan error sebelum kode. | Payload/role/timeout/kompensasi terdokumentasi. |
| 1 / IMP-004 | P0 M | Validasi database MySQL yang telah terprovision, migrasi enam tabel, indeks/FK, koneksi, dan akun seed. | Health DB dan constraint nyata; tanpa secret di repo. Uji pembuatan database kosong dikecualikan oleh pengguna karena akun aplikasi bukan root. |
| 1 / IMP-005 | P0 S | Uji ulang auth dua role, signature, expiry, status aktif. Bergantung DB. | Smoke/unit/E2E auth lulus; gap dicatat. |
| 1 / IMP-006 | P0 M | Tambah dependency microservices, entrypoint TCP, script dev/prod/build, env contoh. | Dua proses hidup terpisah; build/lint lulus. |
| 2 / IMP-007 | P0 S | Lookup departemen/jabatan aktif. Bergantung seed. | ID nonaktif/invalid tidak diterima saat create. |
| 2 / IMP-008 | P0 M | API daftar/detail/create/update/status employee + transaksi dan role. | AC-03–05/11; hash tak bocor; konflik aman. |
| 2 / IMP-009 | P0 M | Service/hook/types/form/list employee React. | UI-04/05 memakai HTTP API nyata. |
| 2 / IMP-010 | P1 M | Pencarian/filter/status aktif dan UX konfirmasi master. | FR-08/09, keadaan kosong/validasi/notifikasi. |
| 3 / IMP-011 | P0 M | Nest TCP service dan kontrak DTO bersama. Bergantung IMP-006. | `ClientProxy.send` ↔ `@MessagePattern`, validasi payload. |
| 3 / IMP-012 | P0 L | Domain create/today, waktu WIB, unique dan pemilik. | AC-06/07; dua request serentak satu row. |
| 3 / IMP-013 | P0 M | List pribadi/detail dan baca monitoring dengan pagination/filter. | Tidak bocor lintas pemilik, HRD hanya baca. |
| 3 / IMP-014 | P0 M | HTTP adapter/proxy, role, timeout, error/requestId. | AC-13/14; auth/master tetap hidup saat TCP mati. |
| 3 / IMP-015 | P1 M | Replace photo/delete own tanggal sama; waktu lama tetap. | AC-15/16; mutasi hari lampau/ADMIN ditolak. |
| 4 / IMP-016 | P0 M | Parser/validasi JPEG/PNG/WebP <=5 MiB; storage privat. | File invalid 400/413/415, tidak ada row. |
| 4 / IMP-017 | P0 M | Signature multipart v2 dan guard endpoint domain. | File/header/nonce/key salah ditolak sebelum side effect. |
| 4 / IMP-018 | P0 M | Foto berizin, cleanup gagal pasti dan rekonsiliasi timeout. | AC-08/10/13; tidak ada path internal di respons. |
| 4 / IMP-019 | P0 L | UI check-in, status, foto, detail, riwayat, ubah/hapus. | UI-02/03/07, timeout cek status sebelum retry. |
| 4 / IMP-020 | P1 S | Pagination riwayat, indikator foto tersedia, dan keadaan data kosong sesuai UI-03. | FR-07/AC-12, hanya data sendiri. |
| 5 / IMP-021 | P0 M | UI monitoring HRD daftar/filter/detail/foto. | UI-06/07 dan AC-09/14, tanpa mutasi HRD. |
| 5 / IMP-022 | P1 M | Toast, motion, UI-08, aksesibilitas/responsif. | Sesuai docs 05, tes keyboard dan reduced motion. |
| 5 / IMP-023 | P0 M | Regresi lintas role, session expiry, proof, input invalid. | Semua alur utama tanpa regressi auth. |
| 6 / IMP-024 | P0 M | Postman domain + kontrak signature dan README setup. | Reviewer dapat mengulang dari checkout/DB bersih. |
| 6 / IMP-025 | P0 L | E2E dua proses + browser demo + failure injection. | DG-01–13/AC-01–16 punya bukti atau gap eksplisit. |
| 6 / IMP-026 | P0 S | Sinkronkan checklist/progres/docs, audit secret/tautan. | Hanya item terbukti dicentang; putusan siap/belum siap jujur. |

Urutan boleh diperbarui bila blocker nyata muncul; catat alasan, dependency baru, dan task terdampak sebelum berpindah. Target akhir seluruh P0 dan P1, tanpa menggunakan tenggat lama sebagai alasan menyembunyikan gap.
