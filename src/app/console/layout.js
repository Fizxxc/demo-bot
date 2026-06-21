export const dynamic = 'force-dynamic';
import { requireOwner } from '../../lib/auth.js';
import BottomNav from '../../components/BottomNav.js';

const navItems = [
  { href: '/console', label: 'Overview', icon: '📊' },
  { href: '/console/users', label: 'Users', icon: '👥' },
  { href: '/console/ewallet', label: 'E-Wallet', icon: '✅' },
  { href: '/console/withdrawals', label: 'Withdraw', icon: '💸' },
  { href: '/console/support', label: 'Chat', icon: '💬' },
  { href: '/console/profile', label: 'Profil', icon: '🛡️' }
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
          <a href="/console">Overview</a>
          <a href="/console/users">Users</a>
          <a href="/console/ewallet">Validasi E-Wallet</a>
          <a href="/console/withdrawals">Withdrawals</a>
          <a href="/console/support">Live Chat</a>
          <a href="/console/notifications">Notifikasi SATSKO</a>
          <a href="/console/profile">Profile</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
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
