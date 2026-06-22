# Tele Auto Order Node.js

Bot Telegram auto order produk digital yang sudah dikonversi dari konsep Python ke **Node.js + Next.js + Supabase**. Bot ini dibuat multi-tenant, jadi satu deploy/script bisa dipakai banyak owner bot. Web dashboard bisa dibuat belakangan dengan Next.js dan tinggal memanggil endpoint register/start/stop yang sudah disiapkan.

## Fitur

- 🛍️ List produk dengan inline button.
- 📦 Cek stok otomatis dari database.
- 🛒 Order produk dengan tombol qty `➖ / ➕`.
- 🚚 Pengiriman akun otomatis dalam file `.txt` setelah saldo cukup.
- 💰 Sistem saldo per user Telegram.
- 📜 Riwayat transaksi.
- 👑 Admin panel sederhana untuk owner bot.
- 🧾 Deposit QRIS otomatis via Pakasir.
- 👑 Owner panel Telegram lengkap: broadcast, add product, add stock, edit harga, aktif/nonaktif produk, data user, atur saldo, pending invoice.
- 🧰 Produk tidak hardcode; produk bisa diisi manual dari Telegram owner sekarang dan nanti bisa diisi dari web dashboard lewat tabel Supabase.
- 🖼️ QRIS ditempel ke `qris-template.png` dengan posisi presisi: `x=617`, `y=843`, `size=818` pada canvas 2048x2048.
- 🔔 Webhook Pakasir akan mengkredit saldo ke Supabase dan mengirim notifikasi ke user.
- 🧩 Siap untuk DOKU nanti karena provider payment sudah dipisah dari logic bot.

## Struktur

```txt
src/app/api/telegram/[tenantId]/route.js     Webhook Telegram per tenant
src/app/api/bots/register/route.js           Register token bot + owner
src/app/api/bots/start/route.js              Start bot / set webhook otomatis
src/app/api/bots/stop/route.js               Stop bot / delete webhook
src/app/api/payments/pakasir/route.js        Webhook payment Pakasir
src/bot/handlers.js                          Logic utama bot
src/lib/pakasir.js                           Integrasi Pakasir
src/lib/qrisImage.js                         Generate gambar QRIS template
supabase/schema.sql                          Tabel, view, dan RPC Supabase
scripts/seed-products.js                     Seed produk contoh dari ZIP lama
```

## Setup Supabase

1. Buat project Supabase.
2. Buka **SQL Editor**.
3. Jalankan isi file `supabase/schema.sql`.
4. Ambil `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` dari dashboard Supabase.

> Service role hanya boleh dipakai di server/Vercel environment variables, jangan pernah dipakai di browser.

## Setup ENV

Copy `.env.example` menjadi `.env.local`.

```bash
APP_URL=https://domain-kamu.vercel.app
DASHBOARD_API_KEY=random_panjang
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
PAKASIR_PROJECT_SLUG=slug_project_pakasir
PAKASIR_API_KEY=api_key_pakasir
```

`PAKASIR_PROJECT_SLUG` dan `PAKASIR_API_KEY` bisa juga diisi per tenant saat register bot. Kalau tenant punya credential sendiri, credential tenant akan dipakai. Kalau kosong, bot memakai fallback dari ENV.

## Install dan run lokal

```bash
npm install
npm run dev
```

Untuk testing webhook Telegram di lokal, pakai URL HTTPS dari ngrok/cloudflared sebagai `APP_URL`.

## Register bot tenant

Contoh setelah deploy/lokal:

```bash
curl -X POST "$APP_URL/api/bots/register" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $DASHBOARD_API_KEY" \
  -d '{
    "botToken": "TOKEN_BOT_TELEGRAM",
    "ownerTelegramId": 123456789,
    "storeName": "Kograph Market",
    "pakasirProjectSlug": "slug_pakasir",
    "pakasirApiKey": "api_key_pakasir"
  }'
```

Response berisi `tenant.id`. Simpan ID ini di dashboard web kamu.

## Start bot / menyalakan webhook

Endpoint ini yang nanti dihubungkan ke tombol **Start Bot** di web. Webhook URL tidak perlu ditampilkan ke user.

```bash
curl -X POST "$APP_URL/api/bots/start" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $DASHBOARD_API_KEY" \
  -d '{"tenantId":"TENANT_ID"}'
```

## Stop bot

Endpoint ini yang nanti dihubungkan ke tombol **Stop Bot**.

```bash
curl -X POST "$APP_URL/api/bots/stop" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $DASHBOARD_API_KEY" \
  -d '{"tenantId":"TENANT_ID"}'
```

## Input produk manual

Produk bisa dibuat langsung dari Telegram oleh owner:

1. Buka bot dan ketik `/start`.
2. Tekan **👑 Admin Panel**.
3. Tekan **➕ Add Product**.
4. Kirim format:

```txt
KODE | NAMA PRODUK | HARGA | DESKRIPSI
```

Contoh:

```txt
YT1 | YouTube Premium 1 Bulan | 15000 | Garansi 7 hari
```

Untuk tambah stok, tekan **📥 Add Stock**, pilih produk, lalu kirim akun per baris:

```txt
username | password | tipe | catatan
```

Contoh multi-stok:

```txt
akun1@mail.com | pass123 | 1 Bulan | Garansi 7 hari
akun2@mail.com | pass456 | 1 Bulan | Garansi 7 hari
```

Produk juga bisa diisi dari web nanti dengan menulis ke tabel `products` dan `product_accounts` di Supabase.

## Seed produk contoh opsional

Kalau tetap ingin memasukkan produk contoh dari bot Python lama:

```bash
TENANT_ID=TENANT_ID npm run seed
```

Atau:

```bash
npm run seed -- TENANT_ID
```


## Fitur Owner Telegram

Di **👑 Admin Panel**, owner bisa mengelola bot langsung dari Telegram:

- ➕ **Add Product**: tambah produk baru tanpa edit file.
- 📥 **Add Stock**: tambah akun stok satuan atau banyak baris sekaligus.
- 🧰 **Kelola Produk**: lihat detail produk, stok, edit harga, aktif/nonaktifkan produk.
- 📢 **Broadcast**: kirim pesan ke semua user bot.
- 👥 **Data User**: lihat user terbaru dan saldo.
- 💵 **Atur Saldo**: tambah/kurangi saldo user manual.
- 🧾 **Pending Invoice**: lihat invoice QRIS yang belum dibayar.

Ketik `/cancel` kapan saja saat sedang berada di mode input owner.

## Webhook Pakasir

Di dashboard Pakasir, isi Webhook URL:

```txt
https://domain-kamu.vercel.app/api/payments/pakasir
```

Bot akan membuat invoice memakai API `transactioncreate/qris`, menyimpan invoice ke Supabase, membuat QR image dari QR string, lalu webhook Pakasir akan memvalidasi status dengan `transactiondetail` sebelum saldo user dikreditkan.

Untuk sandbox Pakasir, kamu bisa memakai endpoint simulasi internal:

```bash
curl -X POST "$APP_URL/api/payments/pakasir/simulate" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $DASHBOARD_API_KEY" \
  -d '{"invoiceId":"INVOICE_UUID"}'
```

## Deploy ke Vercel

1. Push folder ini ke GitHub.
2. Import project di Vercel.
3. Isi semua environment variables dari `.env.example`.
4. Deploy.
5. Register tenant, lalu klik/start via endpoint `/api/bots/start`.

## Catatan DOKU nanti

Saat akun DOKU kamu sudah aktif, tambahkan adapter baru seperti `src/lib/doku.js`, lalu buat endpoint webhook DOKU. Struktur database sudah punya kolom `provider` dengan opsi `doku`, jadi alur saldo dan invoice tetap bisa dipakai.

---

# Web Platform Update

Folder ini sekarang berisi bot + web dashboard dalam satu project Next.js.

## Halaman utama

- `/` landing page minimalis dengan gradient.
- `/portal/daftar` register merchant.
- `/portal/masuk` login owner dan merchant dari halaman yang sama.
- `/pricing` pembelian plan wajib sebelum merchant bisa masuk dashboard.
- `/app` dashboard merchant.
- `/console` dashboard owner platform. Path ini tidak ditampilkan di landing page, tetapi tetap dilindungi role owner server-side.

## Role

- `owner`: pemilik web/platform.
- `merchant`: user yang menyewa bot.

Owner bisa dibuat dengan salah satu cara:

1. Isi `PLATFORM_OWNER_EMAIL` di ENV. Jika email tersebut daftar dari halaman register, role otomatis menjadi owner.
2. Atau jalankan:

```bash
npm run create-owner -- owner@email.com passwordku "Nama Owner"
```

## Plan

Plan diatur di `src/lib/plans.js`:

- Basic: Rp10.000, tidak direkomendasikan untuk serius, hanya mencoba.
- Plus: fitur lengkap.
- Promax: fitur prioritas dan limit pencairan terbesar.

Setelah register, merchant langsung diarahkan ke pricing. Jika belum membeli plan, akses dashboard ditolak oleh SATSKO. Jika 5 hari belum membeli, akun akan diblokir otomatis tanpa menghapus data.

## Wallet merchant

Ada 2 jenis saldo:

- `Saldo Penjualan`: saldo hasil pembelian dari bot. Belum bisa withdraw.
- `Saldo Akun`: saldo yang sudah dicairkan dari saldo penjualan atau dari deposit merchant. Hanya saldo ini yang bisa di-withdraw.

Rules withdraw:

- Hanya bisa request hari Sabtu.
- Biaya layanan 10%.
- Minimal withdraw Rp20.000.
- Maksimal withdraw Rp1.000.000 per request.
- Limit bulanan:
  - Basic Rp500.000
  - Plus Rp1.000.000
  - Promax Rp3.000.000

## E-Wallet

Merchant bisa menambahkan e-wallet di `/app/ewallet`. Provider yang tersedia:

- Gopay
- Dana
- Shopeepay
- Ovo

Owner memvalidasi e-wallet dari `/console/ewallet`.

## Terminal bot

Merchant bisa melihat status bot di `/app/terminal`. Log akan muncul saat:

- Bot disimpan.
- Webhook start.
- Webhook stop.
- Error start/stop.
- Saldo dicairkan.

## SATSKO

SATSKO dibuat sebagai security guard dan CS assistant:

- Mencatat security event.
- Menolak akses merchant tanpa plan.
- Mengirim notifikasi ke owner jika ada akses nakal.
- Memblokir akun yang tidak membeli plan dalam 5 hari.
- Menjawab live chat memakai Hugging Face jika owner tidak membalas dalam 1 menit.

ENV Hugging Face:

```bash
HF_API_TOKEN=hf_xxx
HF_MODEL=HuggingFaceH4/zephyr-7b-beta
```

Jika token HF kosong, SATSKO tetap membalas dengan fallback jawaban bawaan.

## Webhook payment

Webhook Pakasir tetap sama:

```txt
https://domain-kamu.vercel.app/api/payments/pakasir
```

Webhook ini sekarang bisa memproses:

- Deposit saldo customer bot.
- Pembelian plan merchant.
- Deposit saldo akun merchant.

## Cron blokir akun tanpa plan

Endpoint:

```txt
/api/cron/block-unpaid
```

Vercel cron sudah disiapkan di `vercel.json` untuk menjalankan pengecekan setiap hari. Jika ingin proteksi tambahan, isi `CRON_SECRET` dan panggil endpoint dengan query/header secret.

---

## Update Auth Supabase

Versi ini sudah membuat akun di **Supabase Authentication > Users** saat user register, bukan hanya di tabel `web_users`.

Untuk database lama, jalankan dulu file ini di Supabase SQL Editor:

```txt
supabase/migrations_auth_sync.sql
```

Isi migrasi hanya menambah kolom `auth_user_id`, jadi tidak merusak data lama.

Tambahkan ENV baru:

```env
SUPABASE_ANON_KEY=xxxxx
```

Akun lama yang sebelumnya hanya ada di `web_users` akan otomatis disinkronkan ke Supabase Auth saat login berhasil. Kalau ingin sync manual:

```bash
npm run sync-auth-user -- email@user.com passwordBaru
```

Untuk owner:

```bash
npm run create-owner -- owner@email.com passwordOwner "Nama Owner"
```

---

## Update Payment Webhook Logs

Versi ini menambahkan tabel `payment_webhook_logs` untuk menyimpan semua webhook Pakasir, termasuk webhook yang order ID-nya belum ditemukan di invoice aktif.

Jalankan migrasi ini di Supabase SQL Editor:

```txt
supabase/migrations_payment_webhook_logs.sql
```

Setelah migrasi, webhook dengan order ID yang belum ada tidak langsung hilang. Payload akan tersimpan di:

```sql
select *
from payment_webhook_logs
order by created_at desc
limit 20;
```

Catatan: webhook yang masuk ke log tetapi tidak match ke `payment_invoices`, `plan_purchases`, atau `merchant_deposits` tidak akan otomatis mengubah saldo. Itu perlu direkonsiliasi manual karena sistem belum tahu pembayaran tersebut milik user/customer yang mana.

## Update UI Blue/White + Terminal + Profile

Versi ini menambahkan refresh tampilan putih-biru sesuai logo Kograph Market, layout mobile friendly, navbar responsif, chat CS seperti aplikasi chat, terminal bot yang bisa menerima command, toast kecil kanan atas, loading screen glow, halaman Terms/Privacy, popup notifikasi, dan profile security.

### Migration tambahan

Jalankan di Supabase SQL Editor:

```sql
-- file: supabase/migrations_profile_settings.sql
alter table public.web_users
  add column if not exists notifications_enabled boolean not null default true;

create index if not exists idx_web_users_notifications_enabled
  on public.web_users(notifications_enabled);
```

### Terminal Bot

Start/stop bot sekarang ada di halaman **Terminal Bot**, bukan di konfigurasi bot. Command yang tersedia:

```txt
start
stop
status
clear
```

### Push Notification

File service worker ada di:

```txt
public/push-notification.js
```

Saat user login, browser akan menampilkan popup rekomendasi untuk mengaktifkan notifikasi. Preferensinya bisa diubah dari halaman **Profile**.

## Patch Validasi E-Wallet + Responsive + Owner Profile

Update ini memperbaiki halaman **Owner Console → Validasi E-Wallet** supaya tidak kosong saat relasi Supabase gagal dibaca. Data sekarang diambil langsung dari `merchant_ewallets`, lalu user dipetakan manual dari `web_users`, jadi lebih stabil.

Tambahan lain:

- Halaman **Owner Profile** di `/console/profile`.
- Profile owner bisa ganti password dan mengatur notifikasi.
- E-wallet merchant lebih rapi dan mobile friendly.
- Tabel diberi wrapper responsive agar aman di HP.
- Validasi e-wallet sekarang memberi toast success/error.

Kalau e-wallet masih kosong, cek langsung dengan SQL:

```sql
select *
from merchant_ewallets
order by created_at desc
limit 20;
```

Kalau query itu kosong, berarti submit e-wallet belum masuk ke database. Kalau ada isinya, halaman owner sekarang harus menampilkannya.

## Update Bot: QRIS Direct Order + Lucky Spin

Versi ini menambahkan fitur bot Telegram:

- Pembelian produk bisa dibayar memakai **Saldo** atau **QRIS langsung**.
- User tidak wajib deposit dulu jika memilih QRIS langsung.
- Setelah pembayaran QRIS produk sukses, akun langsung dikirim sebagai file `.txt`.
- Jika stok habis saat QRIS sudah dibayar, nominal otomatis dikembalikan ke saldo user bot.
- Fitur **Lucky Spin** berbayar:
  - Rp1.000: peluang kecil, bisa zonk.
  - Rp2.000: peluang lebih baik.
  - Rp3.000: peluang sedang.
  - Rp5.000: peluang terbesar.
- Lucky Spin bisa dibayar via saldo atau QRIS langsung.
- User bisa pilih spin sekaligus: x1, x3, x5, x10, atau x20.
- Owner bisa menambah stock hadiah spin dari Telegram Admin Panel → Stock Spin.
- Hadiah spin bisa berupa akun/voucher text atau bonus saldo sampai Rp100.000.

Jalankan migration tambahan sebelum deploy fitur ini:

```sql
-- Supabase SQL Editor
-- jalankan file ini:
supabase/migrations_bot_qris_spin.sql

-- kalau fitur spin lama sudah pernah dipasang, jalankan juga patch ini:
supabase/migrations_spin_batch_balance_rewards.sql
```

Format tambah stock Lucky Spin via Telegram owner:

```txt
Canva 1 Bulan | 5000 | email: akun@mail.com pass: rahasia | Hadiah utama
Saldo 100K | 5000 | SALDO:100000 | Bonus saldo utama
Saldo 10K | 1000 | SALDO:10000 | Bonus saldo ringan
```

Catatan: `tier_min` menentukan tier minimal hadiah bisa keluar. Hadiah `1000` bisa keluar di semua tier, hadiah `5000` hanya bisa keluar di spin 5K. Untuk hadiah saldo, isi reward dengan format `SALDO:nominal`, maksimal `SALDO:100000`.
