# Kograph Market — UI Design System

## Direction
This UI uses the provided `referensi.txt` as the visual direction: soft grey page background, white cards, clean spacing, strong blue primary actions, rounded controls, and simple creator-platform style hierarchy.

## Design Name
**Kograph Soft Asphalt System**

## Core Tokens
- Page background: `#E8E8E8`
- Primary brand: `#2C5BFF`
- Primary hover: `#1f48d8`
- Text primary: `#0f172a`
- Text secondary: `#334155`
- Muted text: `#64748b`
- Card background: `#FFFFFF`
- Card border: `#f1f5f9`
- Success: `#0f9f6e`
- Warning: `#d99000`
- Danger: `#e63d55`

## Layout Rules
- Public landing page uses soft grey background and white cards.
- Desktop app uses left sidebar.
- Mobile app uses bottom navigation.
- Cards stay white with subtle shadows.
- Use blue only for primary actions, badges, progress, and important links.
- Terminal keeps dark contrast because it represents runtime/process logs.
- Chat bubbles keep sender on the right and receiver/AI on the left.

## Mascot Rules
Mascots must use transparent background `.webp` images in `public/assets/mascots`.

Mapping:
- Dashboard: `support-laptop.webp`
- Product/stock: `products-run-box.webp`
- Terminal/runtime: `celebrate-jump.webp`
- Profile/trust: `profile-thumbs-up.webp`
- Owner/settings/explanation: `presenter-point.webp`
- Support/e-wallet/help: `wave-hello.webp`

## Payment UI Rules
- QRIS image must be generated through `/api/web/billing/qris/[id]`.
- If QR payload is missing, show a clear QR placeholder instead of broken image.
- Billing page must show Order ID, nominal, total bayar, status, and help link.

## Loading Rules
- Loading screen appears only once on first entry per browser session.
- Do not show loading overlay on every page navigation.

## Help Widget Rules
- Help widget appears for active merchant users.
- It provides prompt chips at the top/side and submits to SATSKO.
- Every widget message is saved into Live Chat for history.

## Telegram Bot Interaction Pattern

- Menu utama bot harus tetap ringkas: produk, stok, deposit, riwayat, lucky spin, info.
- Saat membeli produk, tampilkan pilihan `Bayar Saldo` dan `Bayar QRIS`.
- Lucky Spin harus memakai animasi teks bertahap sebelum hasil dikirim.
- Hasil lucky spin langsung dikirim ke chat; hadiah dikirim sebagai file `.txt`.
