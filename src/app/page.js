export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { Bot, ChevronRight, LayoutGrid, MessageCircle, ShieldCheck, Terminal, WalletCards } from 'lucide-react';
import { listPlans } from '../lib/plans.js';
import { formatRupiah } from '../lib/money.js';
import { getCurrentUser } from '../lib/auth.js';
import MascotCard from '../components/MascotCard.js';

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
            <a className="btn" href="#fitur">Fitur</a>
            <a className="btn" href="#pricing">Pricing</a>
            <a className="btn" href="/terms">Terms</a>
            <a className="btn" href="https://t.me/Cs_Kograph"><MessageCircle size={16} /> CS Telegram</a>
            <a className="btn" href="/portal/masuk">Login</a>
            <a className="btn primary" href="/portal/daftar">Daftar <ChevronRight size={16} /></a>
          </div>
        </nav>

        <section className="hero asphalt-hero">
          <div>
            <span className="eyebrow"><ShieldCheck size={14} /> Telegram Commerce Platform</span>
            <h1>Bot jualan Telegram dengan dashboard yang rapi, cepat, dan terasa profesional.</h1>
            <p>
              Kograph Market menggabungkan bot Telegram, QRIS, produk digital, wallet merchant,
              command terminal, support AI SATSKO, dan owner console dalam satu sistem multi-tenant.
            </p>
            <div className="nav-links" style={{ marginTop: 24 }}>
              <a className="btn primary" href="/portal/daftar">Mulai sekarang <ChevronRight size={16} /></a>
              <a className="btn" href="#pricing">Lihat paket</a>
            </div>
            <div className="feature-pills" style={{ marginTop: 22 }}>
              <span className="pill good"><Bot size={14} /> Multi-tenant</span>
              <span className="pill"><Terminal size={14} /> Webhook control</span>
              <span className="pill"><MessageCircle size={14} /> Live chat + AI</span>
              <span className="pill"><LayoutGrid size={14} /> Produk manual</span>
            </div>
          </div>
          <MascotCard
            image="/assets/mascots/support-laptop.webp"
            title="Satu maskot, banyak peran."
            text="Setiap page memakai pose maskot yang sesuai konteks agar dashboard terasa hidup tanpa terlihat ramai."
            badge="Kograph Mascot"
          />
        </section>

        <section id="fitur" className="grid three" style={{ padding: '8px 0 18px' }}>
          <div className="card feature-card">
            <div className="feature-icon"><Terminal size={24} /></div>
            <h3>Terminal Runtime</h3>
            <p>Start / stop webhook, lihat proses, runtime aktif, dan kirim command dengan tampilan command center.</p>
          </div>
          <div className="card feature-card">
            <div className="feature-icon"><WalletCards size={24} /></div>
            <h3>Wallet & Payment</h3>
            <p>QRIS deposit, payout rules, validasi e-wallet, dan pencairan merchant yang rapi.</p>
          </div>
          <div className="card feature-card">
            <div className="feature-icon"><MessageCircle size={24} /></div>
            <h3>SATSKO Assistant</h3>
            <p>Live chat owner + balasan AI saat owner belum membalas, lengkap dengan Help Widget.</p>
          </div>
        </section>

        <section id="pricing" className="grid three" style={{ padding: '18px 0 68px' }}>
          {plans.map((plan) => (
            <div className="card pricing-card" key={plan.code}>
              <span className="badge">{plan.badge}</span>
              <h2 style={{ marginTop: 14 }}>{plan.name}</h2>
              <p>{plan.tone}</p>
              <div className="price">{formatRupiah(plan.price)}</div>
              <ul className="list">{plan.benefits.map((b) => <li key={b}>{b}</li>)}</ul>
              <a className={`btn wide ${plan.code === 'plus' ? 'primary' : ''}`} href="/portal/daftar">Pilih {plan.name}</a>
            </div>
          ))}
        </section>
      </div>
      <footer className="footer professional-footer">
        <div className="container footer-grid">
          <div>
            <a className="logo" href="/"><img className="logo-img" src="/assets/kograph-logo.png" alt="Kograph Market" /><span>Kograph Market</span></a>
            <p>Platform bot Telegram auto-order multi-tenant untuk produk digital, payment QRIS, wallet, dan support.</p>
          </div>
          <div>
            <b>Platform</b>
            <a href="#fitur">Fitur</a>
            <a href="#pricing">Pricing</a>
            <a href="/portal/masuk">Login</a>
          </div>
          <div>
            <b>Legal</b>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="https://t.me/Cs_Kograph">CS Telegram</a>
          </div>
        </div>
      </footer>
    </>
  );
}
