# Risiko dan Dependency

| ID | Risiko/dependency | Dampak | Mitigasi dan pemicu revisi |
| --- | --- | --- | --- |
| RSK-01 | Akun aplikasi tidak memiliki `CREATE DATABASE`; uji DB kosong EV-11 gagal saat audit | Pembuatan database baru tidak diuji oleh akun aplikasi | **Dikecualikan oleh pengguna, 6 Nov 2026.** Administrator menyiapkan database; reviewer mengikuti README untuk migrasi pada database terprovision. Jangan mengosongkan DB utama/shadow. |
| RSK-02 | Dua proses berbagi schema | Perubahan model mematahkan salah satu | Satu pemilik migrasi, build/test kedua proses; perubahan skema melalui migrasi baru. |
| RSK-03 | DB row dan foto tidak atomik | File yatim atau row menunjuk file hilang | Cleanup hanya pada gagal pasti, rekonsiliasi hasil tak pasti, log operasi. |
| RSK-04 | TCP timeout setelah commit | Retry membuat duplikat atau cleanup salah | Periksa today/detail sebelum retry/hapus file; tes fault injection. |
| RSK-05 | Hari bisnis WIB dan DATETIME tanpa zona | Perubahan/hapus lewat tengah malam salah | Satu clock service, UTC storage, tes boundary dan timezone host. |
| RSK-06 | Multipart proof tidak sama dengan raw JSON proof | Foto atau request bisa diubah tanpa terdeteksi | Kontrak `v2` hash file, batas tepat satu field, tes body changed/replay. |
| RSK-07 | Replay cache per proses | Tidak aman untuk beberapa replika HTTP API | MVP satu instance; cache bersama wajib sebelum scale-out. |
| RSK-08 | Password demo tetap di seed saat audit | Kredensial contoh tersebar | Gunakan env seed lokal dan README tanpa password tetap; jangan commit `.env`. |
| RSK-09 | Dokumen disalin ke dua repo terpisah | Versi/tautan dapat menyimpang | Root docs kanonis selama kerja; salin saat repo tersedia dan cek hash/tautan. |
| RSK-10 | Penghapusan fisik attendance hari ini | Bukti HRD dapat hilang | Hanya pemilik pada hari yang sama, konfirmasi UI dan tes; jika audit retention diminta, butuh keputusan skema baru. |
| RSK-11 | Aksi browser domain dan Postman belum didemokan penuh | Integrasi UI dapat menyimpan bug yang tak tertangkap smoke API | Jalankan alur HRD → employee → foto → monitoring → nonaktif, keyboard/mobile/reduced motion, serta koleksi Postman aktual sebelum klaim siap serah. |

Jalur kritis: DB/seed → employee provisioning → service TCP + kontrak → upload/check-in → monitoring → E2E. Pekerjaan UI dapat disiapkan per fitur, tetapi status selesai mensyaratkan API nyata.
