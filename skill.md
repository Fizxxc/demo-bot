# Kograph Market — Development Skill Guide

## 1. Use Referensi Correctly
Use `referensi.txt` as visual direction, not as a command to replace the whole framework. This project remains Next.js because the bot, Supabase routes, webhooks, and dashboard already depend on it.

## 2. Keep Colors Stable
Always preserve:
- background `#E8E8E8`
- primary `#2C5BFF`
- hover `#1f48d8`
- card background `#FFFFFF`

## 3. Mascot Skill
Use transparent `.webp` mascot assets only. Do not re-add white backgrounds.

## 4. AI Skill
SATSKO must never answer only with “AI sedang tidak terhubung.” If Hugging Face token/API fails, use the local SATSKO knowledge fallback with useful troubleshooting.

## 5. Payment Skill
Pakasir response shapes may differ. Always normalize QR fields through `src/lib/paymentNormalize.js` and render with `src/lib/qrisImage.js`.

## 6. QRIS Skill
If Pakasir returns raw QR text, generate QR. If Pakasir returns image URL/data image, composite that image. If no QR is returned, show a clear placeholder.

## 7. Loading Skill
Do not bind loading screen to route clicks/forms. Show it only on initial page load using sessionStorage.

## 8. Live Chat Skill
Use Help Widget for quick prompts and full Support page for chat history. Widget submits to `/api/web/chat/widget`.

## 9. Responsive Skill
- Desktop: sidebar.
- Mobile: bottom nav.
- Avoid horizontal overflow.
- Tables must live inside `.table-wrap`.

## 10. Release Checklist
Before zipping:
1. run `npm install`
2. run `npm run check`
3. ensure `design.md` and `skill.md` are updated
4. ensure mascot assets are `.webp` and transparent
5. never include `node_modules` or `.next` in zip

## Bot Commerce Skill

- Produk harus bisa dibayar via saldo dan QRIS langsung.
- Jangan paksa user deposit jika transaksi bisa dibuat sebagai QRIS direct order.
- Semua invoice QRIS bot harus bisa dicek via tombol `Cek Pembayaran` dan webhook Pakasir.
- Lucky Spin adalah paid random reward, bukan giveaway gratis.
- Hadiah spin harus berasal dari `spin_prizes` agar owner bisa mengatur stok hadiah.
- Jika QRIS produk sukses tapi stok habis, refund otomatis ke saldo user.
