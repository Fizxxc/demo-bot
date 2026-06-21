export const dynamic = 'force-dynamic';
import { requireOwner } from '../../../lib/auth.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';
import MascotCard from '../../../components/MascotCard.js';

export default async function OwnerProfilePage() {
  const owner = await requireOwner();
  const db = supabaseAdmin();
  const [{ count: usersCount }, { count: pendingEwalletCount }, { count: pendingWithdrawCount }, { data: sessions }] = await Promise.all([
    db.from('web_users').select('*', { count: 'exact', head: true }),
    db.from('merchant_ewallets').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('web_sessions').select('id,created_at').eq('user_id', owner.id).order('created_at', { ascending: false }).limit(5)
  ]);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Owner Account</p>
          <h2>Profile Owner</h2>
          <p>Kelola keamanan akun owner, preferensi notifikasi, dan pintasan operasional.</p>
        </div>
      </div>
      <div className="grid two">
        <div className="card profile-hero-card">
          <div className="profile-hero-head">
            <div className="profile-avatar">{(owner.name || owner.email || 'K').slice(0, 1).toUpperCase()}</div>
            <div>
              <h3>{owner.name}</h3>
              <p className="muted">{owner.email}</p>
              <div className="feature-pills">
                <span className="pill good">owner</span>
                <span className="pill">{owner.status}</span>
                <span className="pill">{sessions?.length || 0} sesi</span>
              </div>
            </div>
          </div>
          <div className="grid two compact-grid" style={{ marginTop: 12 }}>
            <div className="stat"><b>Total User</b><strong>{usersCount || 0}</strong></div>
            <div className="stat"><b>E-Wallet Pending</b><strong>{pendingEwalletCount || 0}</strong></div>
            <div className="stat"><b>Withdraw Pending</b><strong>{pendingWithdrawCount || 0}</strong></div>
            <div className="stat"><b>Mode</b><p>Owner Console</p></div>
          </div>
        </div>

        <MascotCard
          image="/assets/mascots/presenter-point.webp"
          title="Owner profile yang lebih rapi."
          text="Semua kontrol penting owner, notifikasi, keamanan, dan pintasan operasional dikumpulkan di sini."
          badge="Owner Mascot"
        />

        <div className="card">
          <h3>Informasi Dasar</h3>
          <form className="form" method="post" action="/api/web/profile/update">
            <input type="hidden" name="returnTo" value="/console/profile" />
            <input className="input" type="text" name="name" defaultValue={owner.name || ''} placeholder="Nama owner" required />
            <input className="input" type="email" value={owner.email || ''} disabled readOnly />
            <button className="btn primary" type="submit">Simpan Profil</button>
          </form>
        </div>

        <div className="card">
          <h3>Preferensi Notifikasi</h3>
          <p className="muted">Aktifkan popup dan push notification untuk event penting owner console.</p>
          <form className="form" method="post" action="/api/web/profile/notifications">
            <input type="hidden" name="returnTo" value="/console/profile" />
            <label className="toggle-line">
              <input type="checkbox" name="enabled" value="1" defaultChecked={owner.notifications_enabled !== false} />
              <span>Aktifkan notifikasi owner</span>
            </label>
            <button className="btn primary" type="submit">Simpan Notifikasi</button>
          </form>
        </div>

        <div className="card">
          <h3>Ganti Password Owner</h3>
          <form className="form" method="post" action="/api/web/profile/password">
            <input type="hidden" name="returnTo" value="/console/profile" />
            <input className="input" type="password" name="oldPassword" placeholder="Password lama" required />
            <input className="input" type="password" name="newPassword" placeholder="Password baru minimal 8 karakter" required />
            <input className="input" type="password" name="confirmPassword" placeholder="Ulangi password baru" required />
            <button className="btn primary" type="submit">Update Password</button>
          </form>
        </div>

        <div className="card soft-card">
          <h3>Pintasan Owner</h3>
          <div className="nav-links">
            <a className="btn" href="/console/ewallet">Validasi E-Wallet</a>
            <a className="btn" href="/console/withdrawals">Withdrawals</a>
            <a className="btn" href="/console/support">Live Chat</a>
            <a className="btn" href="https://t.me/Cs_Kograph" target="_blank" rel="noreferrer">CS Telegram</a>
          </div>
        </div>
      </div>
    </>
  );
}
