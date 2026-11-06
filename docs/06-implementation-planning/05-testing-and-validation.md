# Strategi Pengujian dan Validasi

| Gerbang | Skenario wajib | Bukti |
| --- | --- | --- |
| Build/static | Backend dua entrypoint, frontend, lint, typecheck | Perintah, exit code, tanggal WIB. |
| DB | Status migrasi dan data seed pada database yang telah terprovision; FK, unique email/kode dan absensi | Query/hasil tes integrasi tanpa kredensial. Pembuatan database kosong dikecualikan atas keputusan pengguna. |
| Auth/security | Login dua role, akun nonaktif, JWT expired, proof salah/key lain/replay/body berubah/timestamp | Unit dan smoke HTTP. |
| Master | Transaksi create gagal/berhasil, duplikat, relasi nonaktif, update/status aktif, 403 employee | Integrasi API+DB. |
| Attendance | WIB 23:59/00:00, race, CRUD sendiri hari ini, histori lama tak bisa diubah, HRD read-only | Unit domain + API/TCP/DB. |
| Foto | MIME/magic bytes/ukuran, path traversal, pemilik/ADMIN, cleanup, timeout tak pasti | Integrasi storage sementara dan API. |
| Frontend | UI-01–08, loading/empty/error/success, toast lintas route, fokus keyboard, reduced motion, mobile/desktop | Tes komponen dan walkthrough browser. |
| E2E reviewer | HRD membuat karyawan → employee login/check-in/foto → HRD melihat → employee ganti/hapus hari ini → check-in ulang → HRD nonaktifkan | Log tes, respons/screenshot aman, checklist. |

Jangan jalankan tes DB destruktif pada database pengguna. Gunakan database uji terpisah atau fixture yang dapat dibersihkan dengan aman. Tes service mati mematikan proses **uji** saja, bukan proses pengguna yang mungkin memakai port 3000. Simpan bukti pada [progres](07-implementation-progress.md) dan checklist; item tetap kosong bila tes gagal atau tak dapat dijalankan.
