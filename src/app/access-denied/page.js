export const dynamic = 'force-dynamic';
import { ShieldAlert } from 'lucide-react';

export default async function AccessDenied({ searchParams }) {
  const sp = await searchParams;
  const reason = sp?.reason || 'access_denied';
  return (
    <main className="container" style={{ maxWidth: 720, padding: '70px 0' }}>
      <div className="card">
        <span className="badge"><ShieldAlert size={14} /> SATSKO</span>
        <h2>Akses ditolak</h2>
        <p>Alasan: <code>{reason}</code></p>
        <p>Akun tanpa plan aktif tidak dapat mengakses dashboard. Jika ini salah, hubungi owner platform atau CS.</p>
        <div className="nav-links"><a className="btn primary" href="/pricing">Lihat Pricing</a><a className="btn" href="/portal/masuk">Login</a></div>
      </div>
    </main>
  );
}
