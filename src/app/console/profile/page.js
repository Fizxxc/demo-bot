import { requireOwner } from '../../../lib/auth.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function OwnerProfilePage() {
  const owner = await requireOwner();
  const db = supabaseAdmin();
  const [{ count: usersCount }, { count: pendingEwalletCount }, { count: pendingWithdrawCount }] = await Promise.all([
    db.from('web_users').select('*', { count: 'exact', head: true }),
    db.from('merchant_ewallets').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending')
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
        <div className="card profile-card">
          <div className="profile-avatar">{(owner.name || owner.email || 'K').slice(0, 1).toUpperCase()}</div>
          <h3>{owner.name}</h3>
          <p className="muted">{owner.email}</p>
          <div className="stat-list">
            <div className="stat"><b>Role</b><p>{owner.role}</p></div>
            <div className="stat"><b>Status</b><p>{owner.status}</p></div>
            <div className="stat"><b>Total User</b><p>{usersCount || 0}</p></div>
            <div className="stat"><b>E-Wallet Pending</b><p>{pendingEwalletCount || 0}</p></div>
            <div className="stat"><b>Withdraw Pending</b><p>{pendingWithdrawCount || 0}</p></div>
          </div>
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
