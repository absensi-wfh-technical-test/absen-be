# 02 — Spesifikasi Layar, Visual, dan Konten

ID layar `UI-*` mengacu pada route di [navigasi](01-navigasi-dan-alur.md). Detail notifikasi, respons aksi, transisi, dan komposisi visual ada di [umpan balik interaksi dan sistem visual](03-umpan-balik-interaksi-dan-sistem-visual.md). Ini adalah spesifikasi implementasi, belum mockup final. Semua data contoh bersifat fiktif.

## Komponen dan bahasa visual

**Arah visual [Rancangan]:** antarmuka kerja yang tenang, bersih, dan kredibel. Latar netral terang; warna aksen biru untuk tindakan utama; hijau untuk berhasil; merah untuk kesalahan/destruktif. Gunakan satu keluarga font sans-serif sistem, ukuran dasar 16 px, hierarki judul konsisten, ruang kosong yang cukup, dan angka tanggal/jam mudah dibaca. Jangan memakai warna saja untuk menyampaikan status.

| Token awal | Nilai usulan | Pemakaian |
| --- | --- | --- |
| `color.text` | `#0F172A` | Teks utama. |
| `color.muted` | `#475569` | Teks pendukung. |
| `color.primary` | `#1D4ED8` | Tombol/tautan utama. |
| `color.success` | `#166534` | Status berhasil. |
| `color.error` | `#B91C1C` | Error dan tindakan berisiko. |
| `color.surface` | `#FFFFFF` | Kartu/form. |
| `color.background` | `#F8FAFC` | Latar halaman. |
| `radius.control` | `8px` | Input/tombol. |
| `spacing` | Kelipatan `4px` | Jarak internal dan antarbagian. |

Sebelum implementasi visual final, periksa kontras nyata pada semua kombinasi teks/latar dan keadaan fokus. Foto adalah konten, bukan dekorasi; sediakan keterangan yang berarti. Tabel HRD dapat berubah menjadi kartu pada viewport sempit tanpa menghilangkan informasi penting.

## Spesifikasi per layar

### UI-01 — Login (`/login`)

**Tujuan:** mengautentikasi dua role. **Isi:** judul “Masuk ke Absensi WFH”, label Email, Kata sandi, tombol Masuk, indikator proses. Password dapat ditampilkan/disembunyikan dengan kontrol berlabel. **Validasi:** email wajib/format, kata sandi wajib; error server generik “Email atau kata sandi tidak sesuai, atau akun tidak aktif.” **Berhasil:** setelah identitas `/me` terverifikasi, navigasi ke `/app` atau `/admin/absensi` dengan notifikasi sambutan singkat di halaman tujuan. **Logout:** setelah sesi lokal dibersihkan, kembali ke `/login` dengan notifikasi hasil yang sesuai keadaan API. Pola pesan dan masa tampil mengikuti [spesifikasi umpan balik](03-umpan-balik-interaksi-dan-sistem-visual.md#pola-umpan-balik-per-aksi). Tidak ada tautan “Daftar” atau “Lupa kata sandi” bila alurnya belum tersedia.

### UI-02 — Beranda/check-in karyawan (`/app`)

**Tujuan:** menjawab status hari ini dan menyelesaikan check-in. **Header:** sapaan nama, tanggal bisnis dalam bahasa Indonesia, zona waktu. **Belum absen:** instruksi singkat, input foto dengan tombol “Pilih foto” (opsi kamera bila browser mendukung), pratinjau, nama/ukuran berkas, tombol “Kirim absensi”. **Sudah absen:** panel sukses persisten berisi tanggal, jam, foto/tautan detail; tombol check-in tidak tersedia. Pemilik dapat mengganti foto atau menghapus absensi hari ini setelah konfirmasi; jam/tanggal asli tetap saat foto diganti, dan setelah hapus check-in ulang tersedia. **Mengirim:** progres/label “Mengirim absensi…”, cegah submit ganda. **Error:** dekat input untuk format/ukuran; banner untuk jaringan/storage/service attendance. Upload terjadi di HTTP API, sedangkan waktu resmi ditentukan microservice; UI tidak menampilkan waktu perangkat sebagai waktu resmi check-in.

### UI-03 — Riwayat pribadi (`/app/riwayat`)

**Tujuan:** memberi kepastian absensi terdahulu. **Isi:** daftar tanggal dan jam terbaru lebih dulu, ringkasan foto tersedia, pagination, tautan detail. **Kosong:** “Belum ada riwayat absensi.” **Privasi:** hanya data akun sendiri; tidak ada filter employee lain. Layar ini P1, tetapi status hari ini tetap bagian P0.

### UI-04 — Daftar karyawan (`/admin/karyawan`)

**Tujuan:** mencari dan mengelola master. **Isi:** judul, tombol “Tambah karyawan”, pencarian nama/kode/email, filter status/departemen bila tersedia, tabel/kartu berisi kode, nama, departemen, jabatan, email, status, aksi “Lihat/Ubah”. **Kosong:** bedakan belum ada data dari tak ada hasil filter. **Status:** label Aktif/Nonaktif berbentuk teks dan warna. **Pagination:** pertahankan parameter saat pindah halaman.

### UI-05 — Tambah/ubah karyawan (`/admin/karyawan/baru`, `/admin/karyawan/:id`)

**Tujuan:** menjaga integritas data master. **Form tambah:** kode karyawan, nama lengkap, email, kata sandi awal, departemen, jabatan; nomor telepon dan tanggal bergabung opsional. **Form ubah:** profil yang dapat diubah; password hash/password lama tidak pernah tampil. **Aksi:** Simpan, Batal, dan pada detail ada Aktifkan/Nonaktifkan dengan konfirmasi. **Validasi:** wajib, panjang sesuai skema, kode/email unik, master aktif. **Error konflik:** tunjuk field terkait tanpa menghapus isian lain. Saat pindah dari form yang berubah tanpa simpan melalui tautan aplikasi, Back browser, atau Keluar, tampilkan dialog aplikasi dengan pilihan Tetap di form/Tinggalkan halaman. Penutupan atau pemuatan ulang tab memakai peringatan bawaan browser.

### UI-06 — Monitoring absensi (`/admin/absensi`)

**Tujuan:** memantau bukti check-in. **Isi:** rentang tanggal (default hari ini sebagai **[Rancangan]**), pencarian karyawan, filter departemen, tombol Terapkan/Reset, total hasil, daftar tanggal, jam, kode/nama karyawan, departemen, indikator foto, aksi “Lihat detail”. **Urutan:** terbaru dahulu. **Kosong:** “Tidak ada absensi untuk filter ini” dan aksi reset. **Gangguan service:** pesan sementara dan Coba lagi tanpa menghapus filter; menu Karyawan tetap berfungsi. **Batas akses:** tidak ada aksi ubah/hapus absensi. Filter tetap tersimpan saat kembali dari detail.

### UI-07 — Detail absensi (`/app/riwayat/:id`, `/admin/absensi/:id`)

**Tujuan:** melihat bukti. **Isi:** tanggal dan jam check-in, nama/kode karyawan, departemen/jabatan (ditandai sebagai data terkini), foto bukti dalam area terkendali, tombol kembali. Pada detail pribadi yang masih hari ini tampilkan `Ganti foto` dan `Hapus absensi` dengan konfirmasi; pada hari lampau dan detail HRD keduanya tidak tersedia. Jika foto gagal dibuka, tampilkan “Foto belum dapat dimuat” dan coba lagi; metadata tetap terlihat. Karyawan tidak dapat membuka ID milik orang lain. Jangan pernah tampilkan `photoPath` internal.

### UI-08 — Keadaan sistem

**403:** “Anda tidak memiliki akses ke halaman ini.” dengan tautan Beranda. **404:** “Data tidak ditemukan.” dengan tautan daftar. **401/sesi habis:** “Sesi Anda berakhir. Silakan masuk kembali.” dengan aksi Masuk. **503 attendance service:** “Layanan absensi sementara tidak tersedia. Coba beberapa saat lagi.” plus aksi Coba lagi. **Kegagalan umum:** “Terjadi kendala. Coba lagi.” plus `requestId` bila tersedia untuk dukungan. Untuk check-in timeout, pesan khusus: “Status pengiriman belum pasti. Kami akan memeriksa absensi hari ini.” lalu panggil status hari ini; bila pemeriksaan gagal juga, jangan menyatakan hasil final.

## Inventaris teks antarmuka

| Konteks | Teks utama | Hindari |
| --- | --- | --- |
| Check-in siap | “Unggah foto bukti WFH, lalu kirim absensi.” | Klaim foto sudah tersimpan sebelum respons sukses. |
| Check-in sukses | “Absensi berhasil dicatat pada {tanggal}, pukul {jam} WIB.” | “Sukses!” tanpa informasi. |
| Duplikat | “Anda sudah absen hari ini. Lihat catatan yang tersimpan.” | Menyuruh unggah ulang tanpa cek status. |
| Service absensi mati | “Layanan absensi sementara tidak tersedia. Coba beberapa saat lagi.” | Menampilkan “Belum absen” ketika status sebenarnya belum berhasil dibaca. |
| Foto invalid | “Gunakan foto JPEG, PNG, atau WebP maksimal 5 MB.” | Pesan teknis dari storage/ORM. |
| Simpan karyawan | “Data karyawan berhasil disimpan.” | Mengungkap password awal di notifikasi. |
| Nonaktifkan | “Karyawan ini tidak dapat masuk atau absen lagi. Riwayat absensinya tetap tersimpan.” | “Hapus permanen” bila hanya nonaktif. |

Teks `WIB`, batas 5 MB, dan format foto mengikuti keputusan D-01/D-04 **[Rancangan]**; ubah serempak jika keputusan bisnis berubah.

## Aksesibilitas dan responsif

- Gunakan elemen semantik (`label`, `button`, `form`, `table` bila tabel), urutan fokus logis, dan fokus terlihat. Error field ditautkan melalui `aria-describedby`; notifikasi penting diumumkan dengan live region tanpa mengganggu fokus.
- Target klik nyaman pada ponsel; jangan bergantung pada hover. Input tanggal memakai format lokal yang dapat dipahami, tetapi API tetap `YYYY-MM-DD`.
- Foto pratinjau dapat dihapus/diganti. Beri alt seperti “Foto bukti absensi tanggal …” pada detail; pratinjau input diberi nama berkas.
- Periksa layout setidaknya pada lebar ponsel sempit, tablet, dan desktop. Tabel HRD dapat digulir atau diubah ke kartu, tetapi filter, status, dan aksi tetap dapat ditemukan.
- Jangan menggunakan animasi sebagai satu-satunya penanda hasil. Hormati pengaturan `prefers-reduced-motion` bila menambah transisi.

## Checklist review desain sebelum coding UI

Setiap layar harus punya tujuan, pengguna/izin, data API, aksi utama, status loading/empty/error/success, teks, perilaku responsif, dan cara kembali. Cocokkan UI-01–UI-08 dengan `FR-*`, [kontrak API](../02-solution-architecture/02-kontrak-api-dan-keamanan.md), dan [kriteria penerimaan](../04-product-management/02-rencana-dan-penerimaan.md); keputusan D-01–D-06 harus konsisten di seluruh layar.
