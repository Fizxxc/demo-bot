# Deploy Checklist Vercel

Jika Telegram `getWebhookInfo` menampilkan `Wrong response from the webhook: 404 Not Found`, cek ini:

1. Pastikan Vercel deploy folder yang berisi `package.json` dan `src/app/api/telegram/[tenantId]/route.js`.
2. Jika struktur repo:

```txt
repo/
  tele-auto-order-node/
    package.json
    src/
```

maka Vercel Root Directory harus `tele-auto-order-node`.

3. Jika struktur repo:

```txt
repo/
  package.json
  src/
```

maka Vercel Root Directory dikosongkan.

4. Setelah deploy, tes browser:

```txt
https://domain-kamu.vercel.app/api/telegram/TENANT_ID
```

Harus muncul JSON:

```json
{"ok":true,"message":"Telegram webhook endpoint aktif."}
```

5. Setelah itu klik Stop Bot lalu Start Bot dari dashboard supaya Telegram webhook diset ulang.
