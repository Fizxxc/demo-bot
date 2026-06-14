export default function PrivacyPage() {
  return (
    <main className="container" style={{ maxWidth: 860, padding: '46px 0' }}>
      <a className="logo" href="/"><img className="logo-img" src="/assets/kograph-logo.png" alt="Kograph Market" /><span>Kograph Market</span></a>
      <div className="card" style={{ marginTop: 24 }}>
        <span className="badge">Privacy Policy</span>
        <h1>Kebijakan Privasi</h1>
        <p>Kami menyimpan data yang dibutuhkan untuk menjalankan platform: email, nama, role, plan, tenant bot, produk, transaksi, wallet, e-wallet, dan log keamanan.</p>
        <h3>Keamanan</h3><p>Password dikelola melalui Supabase Auth dan session server-side. Secret seperti service role key tidak boleh ditaruh di browser.</p>
        <h3>Payment</h3><p>Data webhook payment disimpan untuk rekonsiliasi transaksi dan audit. Saldo hanya diproses jika invoice valid ditemukan.</p>
        <h3>Kontak</h3><p>Untuk pertanyaan privasi, hubungi <a href="https://t.me/Cs_Kograph">@Cs_Kograph</a>.</p>
      </div>
    </main>
  );
}
