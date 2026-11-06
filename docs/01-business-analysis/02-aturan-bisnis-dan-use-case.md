# 02 — Aturan Bisnis dan Use Case

## Aturan bisnis

| ID | Aturan | Dasar / status | Penegakan yang direncanakan |
| --- | --- | --- | --- |
| BR-01 | Pengguna harus login sebelum mengakses fitur sesuai perannya. | **[Tes]** login; **[Rancangan]** otorisasi peran | Guard backend; route guard frontend hanya untuk UX. |
| BR-02 | Akun tidak aktif tidak dapat login atau memakai API terlindungi. | **[Skema]** `User.isActive`; **[Rancangan]** perilaku | Cek saat login dan setiap akses yang relevan. |
| BR-03 | Karyawan hanya dapat mengirim dan melihat absensi miliknya. | **[Rancangan]** privasi dan integritas | HTTP API mengambil `employeeId` dari JWT, bukan body request; microservice menerima payload internal terverifikasi. |
| BR-04 | Check-in harus menyertakan foto bukti. | **[Tes]**, **[Skema]** `photoPath` wajib | Validasi unggahan sebelum commit. |
| BR-05 | Tanggal dan waktu check-in ditentukan server. | **[Tes]** pencatatan; **[Keputusan]** sumber waktu | Attendance Microservice membuat timestamp dan menghitung tanggal bisnis `Asia/Jakarta`; abaikan waktu klien. |
| BR-06 | Maksimal satu absensi per karyawan per tanggal bisnis. | **[Skema]** `@@unique([employeeId, attendanceDate])` | Pemeriksaan awal dan tangani benturan unique key saat transaksi. |
| BR-07 | HRD dapat membaca absensi tetapi tidak mengubah atau menghapusnya. | **[Tes]** `view only` | Tidak sediakan endpoint mutasi absensi bagi HRD. |
| BR-08 | HRD dapat menambah/memperbarui data master karyawan. | **[Tes]** | Endpoint admin dengan validasi relasi dan kode unik. |
| BR-09 | Penghapusan karyawan yang punya riwayat diganti penonaktifan. | **[Skema]** relasi `onDelete: Restrict`; **[Rancangan]** | `isActive=false`; tidak menghapus catatan historis. |
| BR-10 | Email akun dan kode karyawan harus unik; seorang akun memiliki maksimal satu profil karyawan. | **[Skema]** unique constraints | Validasi + tangani konflik DB. |
| BR-11 | Departemen dan jabatan harus ada ketika membuat karyawan. | **[Skema]** FK wajib | Pilih dari master aktif; tolak ID tak dikenal/nonaktif. |
| BR-12 | Foto bukti hanya boleh diakses pemilik absensi dan HRD. | **[Rancangan]** kontrol akses | HTTP API menyimpan berkas privat dan melayani foto setelah otorisasi; microservice menyimpan `photoPath`. |
| BR-13 | Riwayat absensi tidak berubah ketika data master karyawan diperbarui. | **[Skema]** relasi ke employee | Baca nama/departemen terkini; jika snapshot historis dibutuhkan, skema perlu berubah. |
| BR-14 | Hanya pemilik aktif dapat mengganti foto absensinya pada tanggal bisnis yang sama; tanggal dan jam check-in asli tidak berubah. | **[Keputusan proyek]** | HTTP API mengambil employeeId dari JWT; service memeriksa pemilik dan tanggal WIB saat mutasi. |
| BR-15 | Hanya pemilik aktif dapat menghapus absensinya pada tanggal bisnis yang sama; setelah row dihapus ia boleh check-in kembali. HRD tetap baca saja. | **[Keputusan proyek]**; CRUD objective **[Tes]** | Service menghapus row, API membersihkan foto privat setelah hasil pasti. |

**Catatan:** `isActive` tidak otomatis membuat constraint database menolak check-in. BR-02/BR-11 harus dijalankan oleh layanan aplikasi. BR-06 tetap harus ditangani di level database untuk kondisi permintaan bersamaan.

## Use case

### UC-01 — Login

**Aktor:** karyawan atau HRD. **Prasyarat:** akun tersedia dan aktif. **Alur utama:** (1) pengguna memasukkan email dan kata sandi; (2) sistem memvalidasi kredensial dan status; (3) sistem membuat sesi; (4) pengguna dialihkan sesuai peran. **Alternatif:** kredensial salah atau akun nonaktif menghasilkan pesan umum tanpa membocorkan akun yang ada. **Hasil:** sesi hanya memiliki identitas dan hak akses sesuai role.

### UC-02 — Check-in WFH

**Aktor:** karyawan. **Prasyarat:** sesi aktif, akun dan profil karyawan aktif. **Alur utama:** (1) lihat status hari ini; (2) pilih/pratinjau foto; (3) kirim ke HTTP API; (4) API memvalidasi dan menyimpan foto privat; (5) Attendance Microservice menerima `employeeId`/`photoPath` melalui TCP, menentukan tanggal bisnis/waktu server, lalu menyimpan absensi; (6) tampilkan bukti berhasil dengan jam dan tanggal. **Alternatif:** belum memilih foto, format/ukuran salah, upload gagal, service tidak tersedia, timeout dengan hasil belum pasti, absensi hari ini sudah ada, atau sesi habis. **Hasil:** tepat satu catatan untuk pasangan karyawan–tanggal; kegagalan pasti memicu cleanup foto, sedangkan timeout perlu pemeriksaan status sebelum retry/cleanup.

### UC-03 — Lihat absensi sendiri

**Aktor:** karyawan. **Prasyarat:** sesi aktif. **Alur utama:** lihat status hari ini dan daftar riwayat pribadi; buka detail dan foto milik sendiri. **Alternatif:** belum ada data ditampilkan sebagai keadaan kosong. **Hasil:** tidak ada data karyawan lain yang terlihat.

### UC-06 — Ganti foto atau hapus absensi hari ini

**Aktor:** karyawan pemilik. **Prasyarat:** sesi aktif, absensi tercatat pada tanggal bisnis `Asia/Jakarta` yang sama. **Alur utama:** pilih ganti foto atau hapus; pada ganti foto, validasi file baru dan pertahankan `attendanceDate`/`checkInAt`; pada hapus, konfirmasi lalu hapus row dan foto, setelah itu check-in ulang boleh dilakukan. **Alternatif:** bukan pemilik, hari lampau, file tidak valid, atau hasil TCP tidak pasti. **Hasil:** HRD tetap tidak memiliki akses mutasi; hasil tak pasti diperiksa sebelum cleanup/retry.

### UC-04 — Kelola karyawan

**Aktor:** HRD. **Prasyarat:** sesi HRD aktif; master departemen/jabatan tersedia. **Alur utama:** lihat daftar; buka detail; tambah akun dan profil dalam satu transaksi atau ubah atribut yang diizinkan; nonaktifkan bila tidak lagi bekerja. **Alternatif:** email/kode duplikat, relasi invalid, data wajib kosong, atau akun mempunyai riwayat. **Hasil:** data master valid dan riwayat absensi tetap utuh.

### UC-05 — Monitor absensi

**Aktor:** HRD (`ADMIN`). **Prasyarat:** sesi HRD aktif. **Alur utama:** filter berdasarkan tanggal/karyawan/departemen melalui HTTP API yang meneruskan pembacaan ke Attendance Microservice; lihat daftar dengan waktu check-in, buka detail dan foto melalui HTTP API. **Alternatif:** tidak ada data sesuai filter; service TCP tidak tersedia; foto tidak tersedia karena masalah storage (tampilkan metadata dan kegagalan yang jelas). **Hasil:** tidak ada tindakan mutasi absensi.

## Jejak user story

| ID | Sebagai… saya ingin… agar… | Use case | Prioritas |
| --- | --- | --- | --- |
| US-01 | Karyawan, login agar hanya saya bisa mengirim absensi saya. | UC-01 | P0 |
| US-02 | Karyawan, mengirim foto dan check-in agar kehadiran WFH tercatat dengan waktu yang akurat. | UC-02 | P0 |
| US-03 | Karyawan, melihat hasil dan riwayat saya agar tidak ragu absensi tersimpan. | UC-03 | P1 |
| US-04 | HRD, membuat dan memperbarui profil karyawan agar data dan aksesnya terkini. | UC-04 | P0 |
| US-05 | HRD, menonaktifkan karyawan agar akses berhenti tanpa menghapus histori. | UC-04 | P1 |
| US-06 | HRD, memfilter dan membuka absensi agar dapat memonitor bukti WFH. | UC-05 | P0 |

Rincian prioritas, cakupan rilis, dan kriteria penerimaan berada pada [dokumen produk](../04-product-management/01-kebutuhan-produk.md) dan [rencana penerimaan](../04-product-management/02-rencana-dan-penerimaan.md).
