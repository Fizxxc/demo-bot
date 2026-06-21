export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { formatRupiah } from '../../lib/money.js';
import MascotCard from '../../components/MascotCard.js';

export default async function OwnerConsole() {
  const db = supabaseAdmin();
  const [users, active, withdrawals, notifications, wallets] = await Promise.all([
    db.from('web_users').select('id', { count: 'exact', head: true }).eq('role', 'merchant'),
    db.from('web_users').select('id', { count: 'exact', head: true }).eq('role', 'merchant').eq('status', 'active'),
    db.from('withdrawals').select('id,amount', { count: 'exact' }).eq('status', 'pending'),
    db.from('owner_notifications').select('*').order('created_at', { ascending: false }).limit(6),
    db.from('merchant_wallets').select('merchant_balance,available_balance')
  ]);
  const totalWallet = (wallets.data || []).reduce((s, w) => s + Number(w.merchant_balance || 0) + Number(w.available_balance || 0), 0);
  const pendingWd = (withdrawals.data || []).reduce((s, w) => s + Number(w.amount || 0), 0);
  return (
    <>
      <div className="topbar"><div><span className="badge">Owner</span><h2>Dashboard Pemilik Web</h2><p>Monitor merchant, validasi e-wallet, withdraw, chat, dan notifikasi SATSKO.</p></div></div>
      <div className="stats">
        <div className="stat">Merchant<strong>{users.count || 0}</strong></div>
        <div className="stat">Active Plan<strong>{active.count || 0}</strong></div>
        <div className="stat">Pending Withdraw<strong>{formatRupiah(pendingWd)}</strong></div>
        <div className="stat">Total Wallet<strong>{formatRupiah(totalWallet)}</strong></div>
      </div>
      <div className="grid two" style={{ marginTop: 18 }}>
        <MascotCard
          image="/assets/mascots/presenter-point.webp"
          title="Owner control center"
          text="Pantau merchant, proses validasi, dan respon chat dari satu dashboard ringkas dengan nuansa putih-biru yang konsisten."
          badge="Console Mascot"
        />
        <div className="card">
          <h3>Notifikasi SATSKO terbaru</h3>
          {(notifications.data || []).length ? (notifications.data || []).map((n) => (
            <div className="stat" key={n.id}><b>{n.title}</b><p>{n.message}</p></div>
          )) : <p className="muted">Belum ada notifikasi terbaru.</p>}
        </div>
      </div>
    </>
  );
}
