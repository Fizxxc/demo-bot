import { requireUser } from '../../lib/auth.js';
import { guardMerchantPlan } from '../../lib/satsko.js';

export default async function MerchantLayout({ children }) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="logo" href="/app"><img className="logo-img" src="/assets/kograph-logo.png" alt="Kograph Market" /><span>Merchant</span></a>
        <nav className="side-nav">
          <a href="/app">Dashboard</a>
          <a href="/app/bot">Bot Setting</a>
          <a href="/app/products">Produk</a>
          <a href="/app/wallet">Deposit & Withdraw</a>
          <a href="/app/ewallet">E-Wallet</a>
          <a href="/app/terminal">Terminal</a>
          <a href="/app/support">Live Chat CS</a>
          <form method="post" action="/api/auth/logout"><button type="submit">Logout</button></form>
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
