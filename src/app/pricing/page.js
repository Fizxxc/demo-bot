import { listPlans } from '../../lib/plans.js';
import { formatRupiah } from '../../lib/money.js';
import { getCurrentUser } from '../../lib/auth.js';

export default async function PricingPage({ searchParams }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const plans = listPlans();
  return (
    <main className="container" style={{ padding: '40px 0 80px' }}>
      <nav className="nav">
        <a className="logo" href="/"><span className="logo-mark">⚡</span><span>Kograph Market</span></a>
        <div className="nav-links">
          {user ? <a className="btn" href={user.role === 'owner' ? '/console' : '/app'}>Dashboard</a> : <a className="btn" href="/portal/masuk">Login</a>}
        </div>
      </nav>
      {sp?.required && <div className="notice">Akun harus membeli plan dulu sebelum bisa mengakses dashboard.</div>}
      <div style={{ margin: '30px 0' }}>
        <span className="eyebrow">Pricing</span>
        <h1>Pilih plan yang cocok.</h1>
        <p>Basic murah untuk coba, Plus untuk fitur lengkap, Promax untuk merchant yang butuh limit besar dan prioritas.</p>
      </div>
      <div className="grid three">
        {plans.map((plan) => (
          <div className="card" key={plan.code}>
            <span className="badge">{plan.badge}</span>
            <h2 style={{ marginTop: 14 }}>{plan.name}</h2>
            <p>{plan.tone}</p>
            <div className="price">{formatRupiah(plan.price)}</div>
            <ul className="list">{plan.benefits.map((b) => <li key={b}>{b}</li>)}</ul>
            {user ? (
              <form method="post" action="/api/web/billing/create">
                <input type="hidden" name="plan" value={plan.code} />
                <button className={`btn ${plan.code === 'plus' ? 'primary' : ''}`} type="submit">Beli {plan.name}</button>
              </form>
            ) : (
              <a className="btn primary" href="/portal/daftar">Daftar untuk beli</a>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
