export default function TermsPage() {
  return (
    <main className="container" style={{ maxWidth: 860, padding: '46px 0' }}>
      <a className="logo" href="/"><img className="logo-img" src="/assets/kograph-logo.png" alt="Kograph Market" /><span>Kograph Market</span></a>
      <div className="card" style={{ marginTop: 24 }}>
        <span className="badge">Terms of Service</span>
        <h1>Ketentuan Layanan</h1>
        <p>Kograph Market menyediakan platform dashboard dan bot Telegram untuk penjualan produk digital. Pengguna bertanggung jawab atas produk, stok, harga, dan layanan yang dijual melalui bot masing-masing.</p>
        <h3>Plan dan Pembayaran</h3><p>Merchant wajib memiliki plan aktif untuk mengakses dashboard. Akun yang belum membeli plan dalam 5 hari dapat diblokir tanpa menghapus data historis.</p>
        <h3>Withdraw</h3><p>Withdraw hanya dapat diajukan hari Sabtu, minimal Rp20.000, maksimal Rp1.000.000 per request, biaya layanan 10%, dan mengikuti limit bulanan sesuai plan.</p>
        <h3>Kontak</h3><p>CS Telegram resmi: <a href="https://t.me/Cs_Kograph">@Cs_Kograph</a>.</p>
      </div>
    </main>
  );
}
