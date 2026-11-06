# Implementation Planning — Absensi WFH DEXA

Dokumen ini menjadi peta kerja setelah audit 6 November 2026. Urutan baca: [kondisi dan gap](01-current-state-and-gap.md) → [traceability](02-requirements-traceability.md) → [roadmap dan backlog](03-roadmap-and-backlog.md) → [rencana service](04-attendance-service-plan.md) → [pengujian](05-testing-and-validation.md) → [risiko](06-risk-and-dependencies.md) → [progres](07-implementation-progress.md). Kontrak utama tetap di folder 01–05. Checklist operasional berada di [CHECKLIST_IMPLEMENTASI_DEXA](../CHECKLIST_IMPLEMENTASI_DEXA.md).

Aturan: PDF assessment menentukan kewajiban eksplisit `DG-*`; keputusan arsitektur dan fitur pelengkap ditandai tersendiri. `IMP-*` hanya selesai setelah acceptance criteria dan bukti uji tercatat di progres. Bila kontrak berubah, perbarui dokumentasi bisnis/arsitektur/UI sebelum kode. Status `Needs Verification` tidak sama dengan selesai. Jangan mengisi kotak checklist berdasarkan keberadaan source saja.

Target dua proses: React/Vite `:5173` → Nest HTTP API `:3000` → Nest TCP Attendance Service `:3001`; MySQL/Prisma 6.19.0 bersama, owner tulis attendance hanya service TCP. Selama pengembangan `docs/` root menjadi sumber tunggal. Salinan ke repo frontend/backend dilakukan saat alamat repo terpisah tersedia, dengan pemeriksaan tautan dan versi.
