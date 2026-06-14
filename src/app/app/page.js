import { requireUser } from '../../lib/auth.js';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { formatRupiah } from '../../lib/money.js';
import { getPlan } from '../../lib/plans.js';

export default async function MerchantHome() {
  const user = await requireUser();
  const db = supabaseAdmin();
  const [{ data: wallet }, { data: tenant }, { count: products }, { count: orders }] = await Promise.all([
    db.from('merchant_wallets').select('*').eq('user_id', user.id).maybeSingle(),
    user.tenant_id ? db.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle() : { data: null },
    user.tenant_id ? db.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id) : { count: 0 },
    user.tenant_id ? db.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id) : { count: 0 }
  ]);
  const plan = getPlan(user.plan_code);
  return (
    <>
      <div className="topbar"><div><span className="badge">{plan?.name} plan</span><h2>Dashboard</h2><p>Halo, {user.name}. Semua sistem merchant ada di sini.</p></div><a className="btn primary" href="/app/bot">Setup Bot</a></div>
      <div className="stats">
        <div className="stat">Saldo Penjualan<strong>{formatRupiah(wallet?.merchant_balance || 0)}</strong></div>
        <div className="stat">Saldo Akun<strong>{formatRupiah(wallet?.available_balance || 0)}</strong></div>
        <div className="stat">Produk<strong>{products || 0}</strong></div>
        <div className="stat">Order<strong>{orders || 0}</strong></div>
      </div>
      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="card"><h3>Status Bot</h3><p><span className={`status-dot ${tenant?.is_active ? 'on' : ''}`}></span> {tenant?.is_active ? 'Bot berjalan' : 'Bot mati / belum disambungkan'}</p><a className="btn" href="/app/terminal">Buka Terminal</a></div>
        <div className="card"><h3>Catatan Saldo</h3><p>Saldo penjualan dari pembelian bot masuk ke Saldo Penjualan dulu. Klik cairkan untuk memindahkannya ke Saldo Akun, baru bisa withdraw.</p><a className="btn" href="/app/wallet">Kelola Wallet</a></div>
      </div>
    </>
  );
}
