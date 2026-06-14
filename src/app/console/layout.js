import { requireOwner } from '../../lib/auth.js';

export default async function ConsoleLayout({ children }) {
  await requireOwner();
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="logo" href="/console"><img className="logo-img" src="/assets/kograph-logo.png" alt="Kograph Market" /><span>Owner Console</span></a>
        <nav className="side-nav">
          <a href="/console">Overview</a>
          <a href="/console/users">Users</a>
          <a href="/console/ewallet">Validasi E-Wallet</a>
          <a href="/console/withdrawals">Withdrawals</a>
          <a href="/console/support">Live Chat</a>
          <a href="/console/notifications">Notifikasi SATSKO</a>
          <form method="post" action="/api/auth/logout"><button type="submit">Logout</button></form>
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
