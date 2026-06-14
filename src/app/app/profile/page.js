import { requireUser } from '../../../lib/auth.js';
import { formatRupiah } from '../../../lib/money.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function ProfilePage() {
  const user = await requireUser();
  const { data: wallet } = await supabaseAdmin().from('merchant_wallets').select('*').eq('user_id', user.id).maybeSingle();
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Account Center</p>
          <h2>Profile & Security</h2>
          <p>Atur keamanan akun, notifikasi, dan detail merchant kamu.</p>
        </div>
      </div>
      <div className="grid two">
        <div className="card profile-card">
          <div className="profile-avatar">{(user.name || user.email || 'K').slice(0, 1).toUpperCase()}</div>
          <h3>{user.name}</h3>
          <p className="muted">{user.email}</p>
          <div className="stat-list">
            <div className="stat"><b>Role</b><p>{user.role}</p></div>
            <div className="stat"><b>Status</b><p>{user.status}</p></div>
            <div className="stat"><b>Plan</b><p>{user.plan_code || 'Belum aktif'}</p></div>
            <div className="stat"><b>Saldo Akun</b><p>{formatRupiah(wallet?.account_balance || 0)}</p></div>
          </div>
        </div>

        <div className="card">
          <h3>Preferensi Notifikasi</h3>
          <p className="muted">Notifikasi dipakai untuk info payment, withdraw, chat CS, dan status bot.</p>
          <form className="form" method="post" action="/api/web/profile/notifications">
            <label className="toggle-line">
              <input type="checkbox" name="enabled" value="1" defaultChecked={user.notifications_enabled !== false} />
              <span>Aktifkan popup dan push notification</span>
            </label>
            <button className="btn primary" type="submit">Simpan Notifikasi</button>
          </form>
          <div className="notice-mini">Browser akan meminta izin notifikasi. Kamu bisa menyalakan atau mematikan dari halaman ini.</div>
        </div>

        <div className="card">
          <h3>Ganti Password</h3>
          <form className="form" method="post" action="/api/web/profile/password">
            <input className="input" type="password" name="oldPassword" placeholder="Password lama" required />
            <input className="input" type="password" name="newPassword" placeholder="Password baru minimal 8 karakter" required />
            <input className="input" type="password" name="confirmPassword" placeholder="Ulangi password baru" required />
            <button className="btn primary" type="submit">Update Password</button>
          </form>
        </div>

        <div className="card soft-card">
          <h3>Bantuan Cepat</h3>
          <p>Butuh bantuan akun, payment, atau bot? Hubungi CS Telegram resmi Kograph.</p>
          <a className="btn primary" href="https://t.me/Cs_Kograph" target="_blank" rel="noreferrer">Chat @Cs_Kograph</a>
          <div className="nav-links" style={{ marginTop: 14 }}>
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
          </div>
        </div>
      </div>
    </>
  );
}
