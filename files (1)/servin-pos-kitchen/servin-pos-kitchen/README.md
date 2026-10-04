# Servin Coffee & Kitchen POS — Kitchen KDS App

Ini **salah satu dari 5 aplikasi** hasil pemisahan project `servin-coffee-_-kitchen-pos` per role
(Customer, Cashier, Kitchen KDS, Owner, Admin). Folder ini hanya berisi kode untuk role **Kitchen KDS**.

## Fitur role ini
- Papan tiket WAITING / COOKING / READY
- Aksi **Start Cooking** → **Mark Ready** → **Complete & Deduct Stock**
- Saat order COMPLETED, bahan (BOM) otomatis dikurangi dari stok dan dicatat di audit trail — hanya sekali per order (idempotent)

## Cara menjalankan
Prasyarat: Node.js.

```bash
npm install
npm run dev        # http://localhost:3003
```

Perintah lain: `npm run build` (production build) dan `npm run lint` (type-check dengan `tsc --noEmit`).

## Struktur
```
src/
├── components/
│   ├── common/
│   │   └── Header.tsx       # header (role tetap, tanpa role switcher)
│   └── kitchen/
│       └── KitchenView.tsx  # UI role (identik 100% dengan project asli)
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

`posService.ts` di app ini hanya memuat method bisnis untuk role Kitchen KDS: `updateOrderStatus` (termasuk pengurangan stok BOM otomatis yang idempotent saat COMPLETED) serta akses baca ke order.
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
