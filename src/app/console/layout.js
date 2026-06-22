export const dynamic = 'force-dynamic';
import { BadgeCheck, Bell, CircleDollarSign, LayoutDashboard, MessageCircle, ShieldCheck, UserRound, Users, WalletCards } from 'lucide-react';
import { requireOwner } from '../../lib/auth.js';
import BottomNav from '../../components/BottomNav.js';

const navItems = [
  { href: '/console', label: 'Overview', icon: LayoutDashboard },
  { href: '/console/users', label: 'Users', icon: Users },
  { href: '/console/ewallet', label: 'E-Wallet', icon: BadgeCheck },
  { href: '/console/withdrawals', label: 'Withdraw', icon: CircleDollarSign },
  { href: '/console/support', label: 'Chat', icon: MessageCircle },
  { href: '/console/profile', label: 'Profil', icon: ShieldCheck }
];

export default async function ConsoleLayout({ children }) {
  const user = await requireOwner();
  return (
    <div className="shell asphalt-shell">
      <aside className="sidebar asphalt-sidebar">
        <a className="logo" href="/console">
          <img className="logo-img" src="/assets/kograph-logo.png" alt="Kograph Market" />
          <span>Owner Console</span>
        </a>
        <div className="sidebar-user-card">
          <div className="profile-avatar mini">{(user.name || user.email || 'K').slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <p>Control center</p>
          </div>
        </div>
        <nav className="side-nav">
          <a href="/console"><LayoutDashboard size={17} /> Overview</a>
          <a href="/console/users"><Users size={17} /> Users</a>
          <a href="/console/ewallet"><BadgeCheck size={17} /> Validasi E-Wallet</a>
          <a href="/console/withdrawals"><CircleDollarSign size={17} /> Withdrawals</a>
          <a href="/console/support"><MessageCircle size={17} /> Live Chat</a>
          <a href="/console/notifications"><Bell size={17} /> Notifikasi SATSKO</a>
          <a href="/console/profile"><UserRound size={17} /> Profile</a>
          <a href="/terms"><ShieldCheck size={17} /> Terms</a>
          <a href="/privacy"><WalletCards size={17} /> Privacy</a>
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
