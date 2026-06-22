# Fix NPM Registry untuk Vercel

Jika Vercel menampilkan error seperti:

```txt
packages.applied-caas-gateway1.internal.api.openai.org ... ETIMEDOUT
```

artinya npm sedang membaca registry internal yang tidak bisa diakses Vercel. Project ini sudah diperbaiki dengan:

1. Menghapus `package-lock.json` lama.
2. Menambahkan `.npmrc`:

```txt
registry=https://registry.npmjs.org/
fetch-retries=5
fetch-retry-mintimeout=20000
fetch-retry-maxtimeout=120000
```

## Langkah upload ulang

1. Upload isi ZIP ini ke GitHub.
2. Pastikan file `package-lock.json` lama tidak ikut ter-commit.
3. Pastikan `.npmrc` ikut ter-commit.
4. Redeploy Vercel.

## Jika masih error

Di Vercel, buka Settings -> Environment Variables, jangan isi registry internal apapun.
Pastikan tidak ada `.npmrc` lain di root repo yang mengarah ke registry internal.
