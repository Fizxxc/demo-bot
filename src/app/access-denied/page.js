export const dynamic = 'force-dynamic';
export default async function AccessDenied({ searchParams }) {
  const sp = await searchParams;
  const reason = sp?.reason || 'denied';
  const messages = {
    no_plan: 'Akses ditolak karena akun belum membeli plan. SATSKO sudah mengirim notifikasi ke owner platform.',
    blocked: 'Akun diblokir.',
    blocked_unpaid: 'Akun diblokir karena tidak membeli plan dalam 5 hari.',
    owner_only: 'Halaman ini hanya untuk owner platform.',
    inactive: 'Akun belum aktif.'
  };
  return (
    <main className="container" style={{ maxWidth: 680, padding: '90px 0' }}>
      <div className="card">
        <span className="badge">🛡️ SATSKO</span>
        <h1>Access denied</h1>
        <p>{messages[reason] || 'Akses tidak diizinkan.'}</p>
        <div className="nav-links"><a className="btn primary" href="/pricing">Beli plan</a><a className="btn" href="/portal/masuk">Login ulang</a></div>
      </div>
    </main>
  );
}
