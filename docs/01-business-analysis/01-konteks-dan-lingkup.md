# 01 — Konteks Bisnis dan Lingkup

## Masalah dan tujuan

**[Tes]** Organisasi membutuhkan cara bagi karyawan WFH untuk login dan mengirim absensi yang mencatat tanggal, waktu, serta foto bukti bekerja dari rumah. Admin HRD membutuhkan pengelolaan data karyawan dan akses baca terhadap absensi yang dikirim.

**[Rancangan]** Produk menyatukan dua pengalaman dalam satu aplikasi web: portal karyawan untuk check-in dan portal HRD untuk administrasi/monitoring. Keberhasilan dasar: karyawan berhasil mengirim satu absensi valid pada hari yang sama; HRD dapat menemukan data tersebut beserta foto dan mengelola data master karyawan tanpa mengubah catatan absensinya.

## Sumber dan batas interpretasi

| Sumber | Fakta yang dipakai | Bukan ketentuan eksplisit |
| --- | --- | --- |
| PDF tes | React.js, NestJS, pilihan DB dengan preferensi MySQL/Oracle; login, absensi tanggal/waktu/foto, master karyawan, HRD melihat absensi; target 3–4 hari, maksimum 5 hari. | Jam kerja, kalender libur, check-out, GPS, approval, ekspor, reset password, detail infrastruktur. |
| `prisma/schema.prisma` | Enam model: `Role`, `User`, `Department`, `Position`, `Employee`, `Attendance`; satu absensi per karyawan per tanggal. | Validasi jenis/ukuran foto, aturan peran aktual, kebijakan jam, atau ketersediaan endpoint. |
| Handoff arsitektur 5 November 2026 | Hybrid architecture dengan HTTP API modular, Attendance Microservice TCP, dan satu MySQL bersama untuk MVP. | Bukti bahwa kedua proses sudah diimplementasikan. |
| Kondisi repo | React/Vite, NestJS, MySQL/Prisma 6.19.0, variabel koneksi DB. | Fitur produk yang sudah berjalan. |

## Pemangku kepentingan dan aktor

| Aktor | Kebutuhan | Akses yang dirancang |
| --- | --- | --- |
| Karyawan aktif | Masuk, mengirim foto bukti, memastikan absensi tercatat, melihat riwayat sendiri. | Data profil dan absensi miliknya saja. Riwayat adalah **[Rancangan]** untuk umpan balik pengguna. |
| Admin HRD aktif | Menambah/memperbarui/nonaktifkan karyawan, melihat daftar dan detail absensi. | Data master karyawan; absensi baca saja. |
| Sistem | Menentukan identitas, waktu server, tanggal bisnis, validasi, penyimpanan foto, audit dasar. | Proses internal tanpa hak pengguna interaktif. |

`roles.code` tersedia pada skema; seed development sudah membuat nilai `EMPLOYEE` dan `ADMIN`. Istilah “HRD” di UI berarti pengguna dengan role `ADMIN` pada MVP. Tidak ada peran supervisor atau approver pada lingkup ini.

## Matriks hak akses

| Sumber daya / tindakan | Karyawan | HRD admin |
| --- | --- | --- |
| Login dan logout | Ya | Ya |
| Lihat profil diri | Ya | Ya |
| Check-in + unggah foto | Ya, untuk diri sendiri | Tidak atas nama karyawan |
| Lihat absensi | Milik sendiri | Seluruh karyawan; baca saja |
| Ganti foto/hapus absensi | Ya, hanya milik sendiri pada tanggal bisnis yang sama **[Keputusan proyek]** | Tidak; HRD tetap baca saja |
| Tambah/ubah/nonaktifkan karyawan | Tidak | Ya |
| Lihat daftar karyawan | Tidak | Ya |
| Kelola master departemen/jabatan | Tidak pada MVP | Tidak pada MVP; data awal melalui seed |

## Lingkup MVP

**Masuk lingkup:** autentikasi berbasis akun aktif; otorisasi peran; master karyawan dengan relasi akun, departemen, jabatan; check-in satu kali per hari dengan foto; tampilan konfirmasi/riwayat pribadi; daftar dan detail absensi HRD dengan filter dasar; penanganan kesalahan utama.

**Di luar lingkup:** check-out, perhitungan jam kerja, pengajuan izin/cuti, approval, geolokasi, pendeteksi wajah, jadwal shift, notifikasi eksternal/push/email, ekspor laporan, aplikasi mobile native, dan self-registration. Toast hasil aksi di aplikasi termasuk umpan balik UI, bukan notifikasi eksternal. Penggantian foto serta penghapusan absensi milik sendiri pada hari yang sama kini termasuk keputusan proyek tambahan, bukan ketentuan eksplisit PDF.

## Alur bisnis tingkat tinggi

1. HRD menyiapkan departemen/jabatan awal, lalu membuat akun dan profil karyawan.
2. Karyawan masuk dengan akun aktif.
3. Karyawan memilih foto bukti dan mengirim check-in.
4. HTTP API memvalidasi JWT, role, status aktif, dan foto; file disimpan lokal dengan nama aman.
5. HTTP API mengirim identitas employee terverifikasi serta `photoPath` melalui TCP ke Attendance Microservice. Microservice menentukan waktu server/tanggal bisnis, memeriksa keunikan, lalu menyimpan metadata absensi melalui Prisma.
6. HTTP API menampilkan hasil kepada karyawan; HRD melihat daftar/detail melalui HTTP API yang meneruskan operasi baca ke microservice tanpa tindakan ubah/hapus.

## Glosarium

| Istilah | Definisi kerja |
| --- | --- |
| Tanggal bisnis | Tanggal kalender absensi menurut zona waktu bisnis (usulan: `Asia/Jakarta`). |
| Check-in | Satu peristiwa pengiriman absensi WFH beserta foto bukti. Skema tidak menyimpan check-out. |
| Foto bukti | Berkas gambar privat; database hanya menyimpan `photo_path`. |
| Nonaktif | `isActive=false` pada akun/profil; data historis tetap tersimpan. |
| Master karyawan | Profil karyawan beserta kaitan akun, departemen, dan jabatan. |

## Pertanyaan bisnis terbuka

Apakah absensi berlaku akhir pekan/libur? Apakah ada batas jam atau status terlambat? Apakah HRD boleh membuat akun lain sesama HRD? Bagaimana akun awal dan pemulihan kata sandi didistribusikan? Berapa lama foto dan catatan disimpan? Jawaban atas pertanyaan ini belum ada pada PDF; asumsi MVP tercatat di [indeks dokumentasi](../README.md#keputusan-yang-perlu-dikunci-sebelum-coding).
