export async function askSatskoAI({ question, context = '' }) {
  const token = process.env.HF_API_TOKEN;
  const model = process.env.HF_MODEL || 'HuggingFaceH4/zephyr-7b-beta';

  const fallback = 'SATSKO: Maaf, AI sedang tidak terhubung. Untuk sementara, saya bisa bantu jelaskan: paket Basic hanya untuk coba, Plus untuk fitur lengkap, Promax untuk fitur prioritas. Withdraw hanya hari Sabtu, minimal Rp20.000, maksimal Rp1.000.000 per request, dan ada biaya layanan 10%.';
  if (!token) return fallback;

  const prompt = `Kamu adalah SATSKO, security guard dan CS AI untuk platform sewa bot Telegram auto order. Jawab dalam Bahasa Indonesia yang sopan, jelas, dan detail. Jangan mengarang data di luar konteks.\n\nKonteks platform:\n${context}\n\nPertanyaan user: ${question}\n\nJawaban SATSKO:`;

  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 320, temperature: 0.35, return_full_text: false }
      })
    });
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text.trim();
    if (data?.generated_text) return data.generated_text.trim();
    return fallback;
  } catch {
    return fallback;
  }
}
