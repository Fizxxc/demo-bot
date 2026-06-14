import { listPlans } from '../lib/plans.js';
import { formatRupiah } from '../lib/money.js';

export default function Home() {
  const plans = listPlans();
  return (
    <>
      <div className="container">
        <nav className="nav">
          <a className="logo" href="/">
            <span className="logo-mark">⚡</span>
            <span>Kograph Market</span>
          </a>
          <div className="nav-links">
            <a className="btn" href="#pricing">Pricing</a>
            <a className="btn" href="/portal/masuk">Login</a>
            <a className="btn primary" href="/portal/daftar">Daftar</a>
          </div>
        </nav>

        <section className="hero">
          <div>
            <span className="eyebrow">🛡️ SATSKO protected • Telegram auto order</span>
            <h1>Sewa bot jualan digital yang rapi, cepat, dan aman.</h1>
            <p>
              Kelola produk, stok akun, saldo, payment QRIS, withdraw merchant, terminal status bot,
              dan live chat CS dalam satu dashboard minimalis.
            </p>
            <div className="nav-links" style={{ marginTop: 24 }}>
              <a className="btn primary" href="/portal/daftar">Mulai sekarang</a>
              <a className="btn" href="#pricing">Lihat paket</a>
            </div>
          </div>
          <div className="hero-card">
            <div className="badge">Dashboard preview</div>
            <h2 style={{ marginTop: 18 }}>Terminal bot</h2>
            <div className="terminal" style={{ minHeight: 260 }}>
              <div className="log"><span className="time">09:10:14</span> <span style={{ color: '#5ee0a0' }}>●</span> webhook online</div>
              <div className="log"><span className="time">09:11:02</span> product sync from Supabase</div>
              <div className="log"><span className="time">09:11:28</span> SATSKO guard active</div>
              <div className="log"><span className="time">09:12:03</span> QRIS invoice generated</div>
            </div>
          </div>
        </section>

        <section id="pricing" className="grid three" style={{ padding: '36px 0 70px' }}>
          {plans.map((plan) => (
            <div className="card" key={plan.code}>
              <span className="badge">{plan.badge}</span>
              <h2 style={{ marginTop: 14 }}>{plan.name}</h2>
              <p>{plan.tone}</p>
              <div className="price">{formatRupiah(plan.price)}</div>
              <ul className="list">
                {plan.benefits.map((b) => <li key={b}>{b}</li>)}
              </ul>
              <a className={`btn ${plan.code === 'plus' ? 'primary' : ''}`} href="/portal/daftar">Pilih {plan.name}</a>
            </div>
          ))}
        </section>
      </div>
      <footer className="footer container">© 2026 Kograph Market. Path owner tidak ditampilkan publik; akses tetap dilindungi role dan session server-side.</footer>
    </>
  );
}
