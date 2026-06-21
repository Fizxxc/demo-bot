export const dynamic = 'force-dynamic';
import { requireUser } from '../../lib/auth.js';
import { guardMerchantPlan } from '../../lib/satsko.js';
import BottomNav from '../../components/BottomNav.js';

const navItems = [
  { href: '/app', label: 'Home', icon: '🏠' },
  { href: '/app/terminal', label: 'Terminal', icon: '🖥️' },
  { href: '/app/products', label: 'Produk', icon: '📦' },
  { href: '/app/wallet', label: 'Wallet', icon: '💳' },
  { href: '/app/support', label: 'CS', icon: '💬' },
  { href: '/app/profile', label: 'Profil', icon: '👤' }
];

export default async function MerchantLayout({ children }) {
  const user = await requireUser();
  await guardMerchantPlan(user);

  return (
    <div className="shell asphalt-shell">
      <aside className="sidebar asphalt-sidebar">
        <a className="logo" href="/app">
          <img className="logo-img" src="/assets/kograph-logo.png" alt="Kograph Market" />
          <span>Kograph Merchant</span>
        </a>
        <div className="sidebar-user-card">
          <div className="profile-avatar mini">{(user.name || user.email || 'K').slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <p>{user.plan_code ? `${user.plan_code.toUpperCase()} plan` : 'Belum aktif'}</p>
          </div>
        </div>
        <nav className="side-nav">
          <a href="/app">Dashboard</a>
          <a href="/app/terminal">Terminal Bot</a>
          <a href="/app/bot">Konfigurasi Bot</a>
          <a href="/app/products">Produk & Stok</a>
          <a href="/app/wallet">Saldo & Withdraw</a>
          <a href="/app/ewallet">E-Wallet</a>
          <a href="/app/support">Live Chat CS</a>
          <a href="/app/profile">Profile</a>
          <a href="https://t.me/Cs_Kograph" target="_blank" rel="noreferrer">CS Telegram</a>
          <form method="post" action="/api/auth/logout"><button type="submit">Logout</button></form>
        </nav>
      </aside>
      <div className="content-shell">
        <main className="main">{children}</main>
        <BottomNav items={navItems} />
      </div>
    </div>
  );
}
