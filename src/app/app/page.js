export const dynamic = 'force-dynamic';
import { requireUser } from '../../lib/auth.js';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { formatRupiah } from '../../lib/money.js';
import { getPlan } from '../../lib/plans.js';
import MascotCard from '../../components/MascotCard.js';

export default async function MerchantHome() {
  const user = await requireUser();
  const db = supabaseAdmin();
  const [{ data: wallet }, { data: tenant }, { count: products }, { count: orders }, { data: ewallets }] = await Promise.all([
    db.from('merchant_wallets').select('*').eq('user_id', user.id).maybeSingle(),
    user.tenant_id ? db.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle() : { data: null },
    user.tenant_id ? db.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id) : { count: 0 },
    user.tenant_id ? db.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id) : { count: 0 },
    db.from('merchant_ewallets').select('id,status').eq('user_id', user.id)
  ]);
  const plan = getPlan(user.plan_code);
  const readyScore = [tenant?.bot_token, tenant?.owner_telegram_id, user.plan_code, (ewallets || []).length > 0].filter(Boolean).length;

  return (
    <>
      <div className="topbar">
        <div>
          <span className="badge">{plan?.name || 'Merchant'} plan</span>
          <h2>Dashboard</h2>
          <p>Halo, {user.name}. Semua sistem merchant ada di sini dengan gaya Asphalt Design System.</p>
        </div>
        <a className="btn primary" href="/app/terminal">Buka Terminal</a>
      </div>

      <div className="stats">
        <div className="stat">Saldo Penjualan<strong>{formatRupiah(wallet?.merchant_balance || 0)}</strong></div>
        <div className="stat">Saldo Akun<strong>{formatRupiah(wallet?.available_balance || 0)}</strong></div>
        <div className="stat">Produk<strong>{products || 0}</strong></div>
        <div className="stat">Order<strong>{orders || 0}</strong></div>
      </div>

      <div className="grid two" style={{ marginTop: 18 }}>
        <MascotCard
          image="/assets/mascots/support-laptop.webp"
          title="Merchant control room"
          text="Pantau terminal, kelola produk, dan lihat semua status bot dari satu dashboard bersih dan mobile friendly."
          badge="Dashboard Mascot"
        />
        <div className="card soft-card">
          <h3>Skor Kesiapan Store</h3>
          <div className="progress-shell"><div className="progress-fill" style={{ width: `${readyScore * 25}%` }} /></div>
          <div className="stat-list">
            <div className="mini-line"><span>Bot token tersimpan</span><b>{tenant?.bot_token ? 'Siap' : 'Belum'}</b></div>
            <div className="mini-line"><span>Owner Telegram ID</span><b>{tenant?.owner_telegram_id ? 'Siap' : 'Belum'}</b></div>
            <div className="mini-line"><span>Plan aktif</span><b>{user.plan_code ? 'Aktif' : 'Belum'}</b></div>
            <div className="mini-line"><span>E-Wallet merchant</span><b>{(ewallets || []).length ? 'Tersedia' : 'Kosong'}</b></div>
          </div>
          <div className="notice-mini">Lengkapi semua item agar alur penjualan dan payout siap dipakai.</div>
        </div>
      </div>

      <div className="grid three" style={{ marginTop: 18 }}>
        <div className="card feature-card">
          <div className="feature-icon">🤖</div>
          <h3>Status Bot</h3>
          <p><span className={`status-dot ${tenant?.is_active ? 'on' : ''}`}></span> {tenant?.is_active ? 'Bot berjalan' : 'Bot mati / belum disambungkan'}</p>
          <a className="btn" href="/app/terminal">Kelola runtime</a>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">📦</div>
          <h3>Produk & Stok</h3>
          <p>Masukkan produk secara manual sekarang, lalu nanti bisa dikembangkan lewat web dan bot.</p>
          <a className="btn" href="/app/products">Buka produk</a>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">💬</div>
          <h3>Support & Security</h3>
          <p>Hubungi CS, cek notifikasi, dan atur keamanan akun dari halaman profil.</p>
          <a className="btn" href="/app/profile">Buka profil</a>
        </div>
      </div>
    </>
  );
}
