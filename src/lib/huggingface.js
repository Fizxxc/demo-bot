function localSatskoAnswer(question = '', context = '') {
  const q = String(question || '').toLowerCase();
  const prefix = 'SATSKO: ';
  const base = 'Saya bantu jelaskan dengan data platform Kograph Market. ';

  if (q.includes('basic') || q.includes('plus') || q.includes('promax') || q.includes('paket') || q.includes('plan') || q.includes('harga')) {
    return prefix + base + 'Plan Basic cocok untuk uji coba ringan dengan fitur terbatas. Plan Plus adalah pilihan utama untuk operasional lengkap. Plan Promax ditujukan untuk merchant yang butuh prioritas, limit withdraw lebih besar, dan fitur tambahan. Setelah membeli plan, status akun akan aktif dan dashboard bisa dipakai penuh.';
  }

  if (q.includes('withdraw') || q.includes('tarik') || q.includes('cair') || q.includes('saldo')) {
    return prefix + base + 'Saldo penjualan harus dicairkan dulu ke Saldo Akun sebelum withdraw. Withdraw hanya dibuka hari Sabtu, minimal Rp20.000, maksimal Rp1.000.000 per request, biaya layanan 10%, dan limit bulanan mengikuti plan: Basic Rp500.000, Plus Rp1.000.000, Promax Rp3.000.000.';
  }

  if (q.includes('ewallet') || q.includes('e-wallet') || q.includes('gopay') || q.includes('dana') || q.includes('ovo') || q.includes('shopeepay')) {
    return prefix + base + 'E-wallet yang didukung adalah Gopay, Dana, Shopeepay, dan OVO. Setelah merchant menambahkan nomor dan nama pemilik, owner harus memvalidasi dulu. Withdraw hanya bisa memakai e-wallet berstatus valid.';
  }

  if (q.includes('qris') || q.includes('pembayaran') || q.includes('payment') || q.includes('pakasir') || q.includes('invoice')) {
    return prefix + base + 'Pembayaran memakai Pakasir QRIS. Pastikan PAKASIR_PROJECT_SLUG dan PAKASIR_API_KEY sudah benar, webhook Pakasir mengarah ke /api/payments/pakasir, dan order_id invoice tersimpan di tabel payment_invoices, plan_purchases, atau merchant_deposits. Jika QR tidak muncul, biasanya payload QR dari Pakasir kosong atau credential salah.';
  }

  if (q.includes('bot') || q.includes('telegram') || q.includes('webhook') || q.includes('start') || q.includes('mati') || q.includes('respon')) {
    return prefix + base + 'Untuk bot Telegram, pastikan APP_URL memakai domain Vercel aktif tanpa garis miring di akhir, token bot benar, tenant sudah tersimpan, lalu jalankan Start Bot dari Terminal. Jika bot tidak respon, cek getWebhookInfo Telegram dan Vercel Function Logs.';
  }

  if (q.includes('produk') || q.includes('stock') || q.includes('stok') || q.includes('akun')) {
    return prefix + base + 'Produk dan stok bisa ditambahkan dari dashboard atau menu owner Telegram. Format stok yang disarankan: username | password | tipe | catatan. Bot akan mengirim file akun otomatis setelah pembelian berhasil.';
  }

  return prefix + base + 'Kograph Market adalah platform bot Telegram auto-order multi-tenant dengan dashboard, produk digital, QRIS, wallet, withdraw, e-wallet, dan live chat. Jelaskan kendala kamu lebih detail, misalnya tentang bot, payment, produk, wallet, atau akun, agar saya bisa memberi langkah yang tepat.';
}

function cleanGeneratedText(text, prompt) {
  let out = String(text || '').trim();
  if (!out) return '';
  if (prompt && out.startsWith(prompt)) out = out.slice(prompt.length).trim();
  out = out.replace(/^Jawaban SATSKO:\s*/i, '').trim();
  return out;
}

export async function askSatskoAI({ question, context = '' }) {
  const token = process.env.HF_API_TOKEN;
  const model = process.env.HF_MODEL || 'HuggingFaceH4/zephyr-7b-beta';
  const localAnswer = localSatskoAnswer(question, context);

  if (!token) return localAnswer;

  const prompt = `Kamu adalah SATSKO, security guard dan CS AI untuk platform sewa bot Telegram auto order bernama Kograph Market. Jawab dalam Bahasa Indonesia yang sopan, jelas, detail, dan langsung membantu. Jangan mengarang data di luar konteks. Jika API/credential belum tersedia, tetap beri troubleshooting lokal yang berguna, jangan bilang AI tidak terhubung.\n\nKonteks platform:\n${context}\n\nPertanyaan user: ${question}\n\nJawaban SATSKO:`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 360, temperature: 0.35, return_full_text: false },
        options: { wait_for_model: true }
      })
    });
    clearTimeout(timer);

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) return localAnswer;

    const generated = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
    const cleaned = cleanGeneratedText(generated, prompt);
    return cleaned || localAnswer;
  } catch {
    return localAnswer;
  }
}
