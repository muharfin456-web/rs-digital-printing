# RS Digital Printing — Web App

Web app responsif untuk **RS Digital Printing** (Desa Samborejo, Kec. Tirto, Kab. Pekalongan).
Dibangun berdasarkan PRD `product_requirements_document_rs_digital_printing (1).md`.

## Fitur yang tersedia

### Customer (`index.html`)
- Hero + profil bisnis dengan logo `assets/images/logo-rs.png`
- Katalog portofolio dengan filter: Semua, Logo, Packaging, Baju, Lanyard, Stiker, Bros
- Kartu desain berisi gambar, judul, **kode referensi/SKU**, kategori, spesifikasi, dan estimasi harga
- Modal **Request Desain Serupa** (nama, no. WhatsApp, qty, catatan, nominal)
- Modal **Dummy QRIS** dengan barcode simulasi yang dihasilkan dari ID transaksi
- Simulasi pembayaran → transaksi tersimpan status `PAID`
- Struk sukses + tombol **Lanjut ke WhatsApp Admin** dengan pesan otomatis terformat
- Floating WA button, navigasi mobile, lazy loading gambar

### Admin (`admin.html`)
- Login (demo lokal)
- Dashboard: total uang masuk, jumlah pesanan, transaksi lunas, status pengerjaan, pesanan terbaru
- Tabel transaksi: pencarian, filter status, update status (`BARU → DESAIN → CETAK → SELESAI`), chat WA customer
- CRUD katalog: tambah/edit/hapus desain, upload foto dengan kompresi otomatis ke WebP, toggle aktif/nonaktif
- Pengaturan: nomor WA admin dan reset data demo

## Cara menjalankan

Cukup buka `index.html` di browser. Untuk hasil terbaik, jalankan lewat server statis lokal:

```powershell
# Jika Python tersedia
python -m http.server 8000

# Atau dengan Node.js
npx serve .
```

Lalu buka `http://localhost:8000/index.html` dan `http://localhost:8000/admin.html`.

> **Catatan:** Karena memakai Tailwind CDN dan Google Fonts, koneksi internet diperlukan saat development.
> Untuk produksi, disarankan memasang Tailwind via build step agar tidak bergantung CDN.

## Akun admin demo

| Field | Nilai |
| :--- | :--- |
| Email | `admin@rsdigitalprinting.id` |
| Password | `rsadmin2026` |

## Integrasi WhatsApp

Nomor tujuan: **0895 6167 65522** → `https://wa.me/6285616765522?text=...`

Format pesan otomatis mengikuti Pasal 9.1 PRD (ID transaksi, nama, referensi desain, jumlah, total dibayar, catatan request).
Nomor didefinisikan di `js/store.js`:

```js
const WA_NUMBER = "0895616765522";
const WA_INTERNATIONAL = "6285616765522";
```

## Struktur folder

```text
rs-digital-printing/
├── index.html                 # Halaman customer
├── admin.html                 # Panel admin
├── assets/
│   └── images/
│       ├── logo-rs.png        # Logo bisnis (dari gambar yang dilampirkan)
│       └── portfolio/         # Tempat foto proyek asli (.webp)
├── css/
│   └── custom.css             # Design system + animasi + print struk
└── js/
    ├── store.js               # Lapisan data (localStorage → siap diganti Firestore)
    ├── app.js                 # Logika customer
    └── admin.js               # Logika admin
```

## Status backend

Belum ada kredensial Firebase, jadi data saat ini tersimpan di **localStorage perangkat** (fallback demo).
Struktur dokumen sudah mengikuti skema Firestore di PRD:

- `portfolios` → `portfolio_id`, `sku_code`, `title`, `category`, `description`, `base_price`, `image_url`, `is_active`, `created_at`
- `transactions` → `transaction_id`, `portfolio_id`, `sku_reference`, `customer_name`, `customer_whatsapp`, `quantity`, `custom_notes`, `amount_paid`, `payment_method`, `payment_status`, `order_status`, `paid_at`

Untuk pindah ke Firebase:
1. Tambahkan Firebase SDK dan isi config di `js/firebase-config.js` (belum dibuat karena kredensial belum ada).
2. Ganti fungsi `read`/`write`/`getTransactions`/`createTransaction`/`updateTransactionStatus`/`savePortfolio`/`deletePortfolio` di `js/store.js` dengan panggilan Firestore + `onSnapshot` untuk real-time.
3. Ganti `login()` dengan `signInWithEmailAndPassword`, dan pasang Firestore Rules sesuai Pasal 9.3 PRD.

## Catatan desain

Desain Figma tidak dapat diakses (file private). UI dibangun berdasarkan PRD dengan sistem warna yang mudah diubah
melalui CSS variables di bagian `:root` pada `css/custom.css`:

```css
--rs-primary: #f97316;      /* Warna utama */
--rs-primary-dark: #ea580c; /* Hover / teks tebal */
--rs-ink: #0f172a;          /* Teks utama */
--rs-bg: #fffaf5;           /* Latar halaman */
```

Ubah nilai tersebut untuk mendekatkan tampilan ke desain Figma final.
Foto portofolio memakai **12 foto dummy lokal** di `assets/images/portfolio/`, satu foto untuk setiap judul katalog
(mis. `sachet-kopi-premium.jpg`, `kaos-komunitas.jpg`, `box-hampers-lebaran.jpg`, dll.). Sumber foto:
Pexels (gratis dipakai), sudah diunduh sehingga tetap tampil offline. Ganti `image_url` dengan foto proyek asli
(disarankan `.webp`, maks. 150 KB, `loading="lazy"` sudah aktif) melalui panel admin atau langsung di `js/store.js`
pada `SEED_PHOTOS`/`SEED_PORTFOLIOS`. Placeholder SVG otomatis tetap dipakai sebagai fallback.

Data lama otomatis dimigrasikan ke foto per judul saat halaman dibuka; foto yang pernah Anda upload lewat panel admin
tidak akan ditimpa.
