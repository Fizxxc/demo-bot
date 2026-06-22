export const dynamic = 'force-dynamic';
import { Bot, Boxes, CircleDollarSign, Home, MessageCircle, Terminal, UserRound, WalletCards } from 'lucide-react';
import { requireUser } from '../../lib/auth.js';
import { guardMerchantPlan } from '../../lib/satsko.js';
import BottomNav from '../../components/BottomNav.js';

const navItems = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/app/terminal', label: 'Terminal', icon: Terminal },
  { href: '/app/products', label: 'Produk', icon: Boxes },
  { href: '/app/wallet', label: 'Wallet', icon: WalletCards },
  { href: '/app/support', label: 'CS', icon: MessageCircle },
  { href: '/app/profile', label: 'Profil', icon: UserRound }
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
          <a href="/app"><Home size={17} /> Dashboard</a>
          <a href="/app/terminal"><Terminal size={17} /> Terminal Bot</a>
          <a href="/app/bot"><Bot size={17} /> Konfigurasi Bot</a>
          <a href="/app/products"><Boxes size={17} /> Produk & Stok</a>
          <a href="/app/wallet"><CircleDollarSign size={17} /> Saldo & Withdraw</a>
          <a href="/app/ewallet"><WalletCards size={17} /> E-Wallet</a>
          <a href="/app/support"><MessageCircle size={17} /> Live Chat CS</a>
          <a href="/app/profile"><UserRound size={17} /> Profile</a>
          <a href="https://t.me/Cs_Kograph" target="_blank" rel="noreferrer"><MessageCircle size={17} /> CS Telegram</a>
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
