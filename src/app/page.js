import { redirect } from 'next/navigation';
import { listPlans } from '../lib/plans.js';
import { formatRupiah } from '../lib/money.js';
import { getCurrentUser } from '../lib/auth.js';

export default async function Home() {
  const user = await getCurrentUser();
  if (user?.role === 'owner') redirect('/console');
  if (user?.role === 'merchant' && user.plan_code) redirect('/app');
  if (user?.role === 'merchant' && !user.plan_code) redirect('/pricing?required=1');

  const plans = listPlans();
  return (
    <>
      <div className="container">
        <nav className="nav">
          <a className="logo" href="/"><img className="logo-img" src="/assets/kograph-logo.png" alt="Kograph Market" /><span>Kograph Market</span></a>
          <div className="nav-links">
            <a className="btn" href="#pricing">Pricing</a>
            <a className="btn" href="/terms">Terms</a>
            <a className="btn" href="https://t.me/Cs_Kograph">CS Telegram</a>
            <a className="btn" href="/portal/masuk">Login</a>
            <a className="btn primary" href="/portal/daftar">Daftar</a>
          </div>
        </nav>

        <section className="hero">
          <div>
            <span className="eyebrow">Bot Telegram auto order • clean dashboard</span>
            <h1>Kelola bot jualan digital dengan tampilan rapi.</h1>
            <p>
              Kograph Market menggabungkan bot Telegram, QRIS, produk digital, wallet merchant,
              terminal log, dan live chat CS dalam satu dashboard putih-biru yang ringan.
            </p>
            <div className="nav-links" style={{ marginTop: 24 }}>
              <a className="btn primary" href="/portal/daftar">Mulai sekarang</a>
              <a className="btn" href="#pricing">Lihat paket</a>
            </div>
          </div>
          <div className="hero-card">
            <div className="badge">Preview terminal</div>
            <h2 style={{ marginTop: 18 }}>Webhook status</h2>
            <div className="terminal" style={{ minHeight: 250 }}>
              <div className="log"><span className="time">12:00:01</span> $ start bot</div>
              <div className="log"><span className="time">12:00:02</span> validating tenant...</div>
              <div className="log"><span className="time">12:00:03</span> setting Telegram webhook...</div>
              <div className="log"><span className="time">12:00:04</span> webhook online ✅</div>
            </div>
          </div>
        </section>

        <section id="pricing" className="grid three" style={{ padding: '28px 0 68px' }}>
          {plans.map((plan) => (
            <div className="card" key={plan.code}>
              <span className="badge">{plan.badge}</span>
              <h2 style={{ marginTop: 14 }}>{plan.name}</h2>
              <p>{plan.tone}</p>
              <div className="price">{formatRupiah(plan.price)}</div>
              <ul className="list">{plan.benefits.map((b) => <li key={b}>{b}</li>)}</ul>
              <a className={`btn ${plan.code === 'plus' ? 'primary' : ''}`} href="/portal/daftar">Pilih {plan.name}</a>
            </div>
          ))}
        </section>
      </div>
      <footer className="footer container">
        <div className="nav-links">
          <span>© 2026 Kograph Market</span>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="https://t.me/Cs_Kograph">@Cs_Kograph</a>
        </div>
      </footer>
    </>
  );
}
