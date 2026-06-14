import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/auth.js';

function target(user) {
  if (user.role === 'owner') return '/console';
  if (!user.plan_code) return '/pricing?required=1';
  return '/app';
}

export default async function RegisterPage({ searchParams }) {
  const user = await getCurrentUser();
  if (user) redirect(target(user));
  const sp = await searchParams;
  const error = sp?.error;
  return (
    <main className="container" style={{ maxWidth: 520, padding: '70px 0' }}>
      <a className="logo" href="/"><img className="logo-img" src="/assets/kograph-logo.png" alt="Kograph Market" /><span>Kograph Market</span></a>
      <div className="card" style={{ marginTop: 28 }}>
        <span className="badge">Daftar merchant</span>
        <h2 style={{ marginTop: 12 }}>Buat akun</h2>
        <p>Setelah daftar, kamu langsung diarahkan ke pricing dan wajib membeli plan dulu.</p>
        {error && <div className="notice">Pendaftaran gagal: {error}</div>}
        <form className="form" method="post" action="/api/auth/register">
          <input className="input" name="name" placeholder="Nama" required />
          <input className="input" name="email" type="email" placeholder="Email" required />
          <input className="input" name="password" type="password" placeholder="Password minimal 8 karakter" minLength="8" required />
          <button className="btn primary" type="submit">Daftar</button>
        </form>
        <p>Sudah punya akun? <a href="/portal/masuk">Login</a></p>
      </div>
    </main>
  );
}
