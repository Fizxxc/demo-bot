import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/auth.js';

function target(user) {
  if (user.role === 'owner') return '/console';
  if (!user.plan_code) return '/pricing?required=1';
  return '/app';
}

export default async function LoginPage({ searchParams }) {
  const user = await getCurrentUser();
  if (user) redirect(target(user));
  const sp = await searchParams;
  const error = sp?.error;
  return (
    <main className="container" style={{ maxWidth: 520, padding: '70px 0' }}>
      <a className="logo" href="/"><img className="logo-img" src="/assets/kograph-logo.png" alt="Kograph Market" /><span>Kograph Market</span></a>
      <div className="card" style={{ marginTop: 28 }}>
        <span className="badge">Secure login</span>
        <h2 style={{ marginTop: 12 }}>Masuk</h2>
        <p>Owner dan merchant login dari halaman yang sama. Role akan diarahkan otomatis.</p>
        {error && <div className="notice">Login gagal: {error}</div>}
        <form className="form" method="post" action="/api/auth/login">
          <input className="input" name="email" type="email" placeholder="Email" required />
          <input className="input" name="password" type="password" placeholder="Password" required />
          <button className="btn primary" type="submit">Login</button>
        </form>
        <p>Belum punya akun? <a href="/portal/daftar">Daftar</a></p>
      </div>
    </main>
  );
}
