# Servin Coffee & Kitchen POS — Cashier App

Ini **salah satu dari 5 aplikasi** hasil pemisahan project `servin-coffee-_-kitchen-pos` per role
(Customer, Cashier, Kitchen KDS, Owner, Admin). Folder ini hanya berisi kode untuk role **Cashier**.

## Fitur role ini
- Tab **New Ticket**: input pesanan cepat dengan sentuhan
- Tab **Active Dockets**, **Transactions**, dan **Status Monitor**
- Pembayaran Cash (tombol nominal cepat: Exact, 20rb, 50rb, 100rb, 200rb) atau QRIS
- Memantau status dapur secara live

## Cara menjalankan
Prasyarat: Node.js.

```bash
npm install
npm run dev        # http://localhost:3002
```

Perintah lain: `npm run build` (production build) dan `npm run lint` (type-check dengan `tsc --noEmit`).

## Struktur
```
src/
├── assets/
│   └── images/              # gambar menu
├── components/
│   ├── cashier/
│   │   └── CashierView.tsx  # UI role (identik 100% dengan project asli)
│   └── common/
│       ├── Header.tsx       # header (role tetap, tanpa role switcher)
│       └── StatusBadge.tsx  # badge status (Kitchen / Payment / Stock)
├── services/
│   └── posService.ts        # data layer: seed data + method khusus role ini
├── types/
│   └── pos.ts               # data model (sama di semua app)
├── utils/
│   └── formatters.ts        # helper format Rupiah, tanggal, notifikasi
├── App.tsx                  # shell khusus role ini
├── index.css                # Tailwind + style global
└── main.tsx                 # entry point
```

`posService.ts` di app ini hanya memuat method bisnis untuk role Cashier: `createOrder`, `processPayment`, serta akses baca ke menu, kategori, dan order.
Storage key dan seed data sengaja dibuat identik di kelima app, supaya tiap app bisa jalan sendiri dan tetap memakai data contract yang sama.

## Catatan penting

### Data tidak otomatis dibagi antar role
Project asli menyimpan semua data di `localStorage`, dan `localStorage` dipisah per **origin** (protokol + host + port).
Karena tiap role sekarang jalan di port berbeda (Customer 3001, Cashier 3002, Kitchen 3003, Owner 3004, Admin 3005),
app ini **tidak** otomatis berbagi data dengan role lain. Misalnya, pesanan dari Customer tidak akan muncul di Kitchen.
App ini tetap berjalan penuh dengan seed data bawaan (termasuk sample order ORD-1024).

Untuk menyambungkan lagi antar role, ada dua jalan:
1. Host kelima build di **satu origin yang sama** (domain & port sama, beda path; perlu mengatur `base` di `vite.config.ts`), karena key `localStorage` di kelima app identik.
2. Pindahkan data layer ke backend/database. Semua akses data sudah terpusat di `src/services/posService.ts`.

### Gambar lokal hanya jalan di dev server
Seed data menunjuk gambar lewat path string `/src/assets/images/...`. Path itu hanya dilayani oleh Vite dev server (`npm run dev`).
Pada `npm run build`, file `.jpg` tidak ikut ter-bundle sehingga gambar-gambar itu akan 404 di hasil build. Ini perilaku bawaan project aslinya
(tidak diubah di sini). Bila ingin deploy: pindahkan gambar ke folder `public/` lalu ubah path-nya di seed data.
