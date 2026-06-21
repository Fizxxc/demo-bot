export const dynamic = 'force-dynamic';
import { requireUser } from '../../../lib/auth.js';
import { formatRupiah } from '../../../lib/money.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';
import MascotCard from '../../../components/MascotCard.js';

export default async function ProfilePage() {
  const user = await requireUser();
  const db = supabaseAdmin();
  const [{ data: wallet }, { data: tenant }, { data: ewallets }, { data: sessions }] = await Promise.all([
    db.from('merchant_wallets').select('*').eq('user_id', user.id).maybeSingle(),
    user.tenant_id ? db.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle() : { data: null },
    db.from('merchant_ewallets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
    db.from('web_sessions').select('id,created_at,expires_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
  ]);
  const completion = [user.name, user.email, tenant?.bot_token, user.plan_code, (ewallets || []).length > 0].filter(Boolean).length * 20;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Account Center</p>
          <h2>Profile & Security</h2>
          <p>Atur keamanan akun, notifikasi, identitas merchant, dan akses cepat dari satu tempat.</p>
        </div>
      </div>

      <div className="grid two">
        <div className="card profile-hero-card">
          <div className="profile-hero-head">
            <div className="profile-avatar">{(user.name || user.email || 'K').slice(0, 1).toUpperCase()}</div>
            <div>
              <h3>{user.name}</h3>
              <p className="muted">{user.email}</p>
              <div className="feature-pills">
                <span className="pill good">{user.role}</span>
                <span className="pill">{user.status}</span>
                <span className="pill">{user.plan_code || 'no plan'}</span>
              </div>
            </div>
          </div>
          <div className="progress-shell" style={{ marginTop: 18 }}><div className="progress-fill" style={{ width: `${completion}%` }} /></div>
          <p className="muted" style={{ marginTop: 10 }}>Kelengkapan akun: {completion}%</p>
          <div className="grid two compact-grid" style={{ marginTop: 12 }}>
            <div className="stat"><b>Saldo Akun</b><strong>{formatRupiah(wallet?.available_balance || 0)}</strong></div>
            <div className="stat"><b>Saldo Merchant</b><strong>{formatRupiah(wallet?.merchant_balance || 0)}</strong></div>
            <div className="stat"><b>Bot Store</b><p>{tenant?.store_name || 'Belum disetel'}</p></div>
            <div className="stat"><b>Sesi aktif</b><p>{sessions?.length || 0} perangkat</p></div>
          </div>
        </div>

        <MascotCard
          image="/assets/mascots/profile-thumbs-up.webp"
          title="Profil yang lengkap bikin operasional lebih enak."
          text="Gunakan halaman ini untuk mengatur keamanan, notifikasi, dan akses cepat ke fitur merchant penting."
          badge="Profile Mascot"
        />

        <div className="card">
          <h3>Informasi Dasar</h3>
          <form className="form" method="post" action="/api/web/profile/update">
            <input type="hidden" name="returnTo" value="/app/profile" />
            <input className="input" type="text" name="name" defaultValue={user.name || ''} placeholder="Nama lengkap / nama merchant" required />
            <input className="input" type="email" value={user.email || ''} disabled readOnly />
            <button className="btn primary" type="submit">Simpan Profil</button>
          </form>
          <div className="notice-mini">Email login tidak diubah dari halaman ini untuk menjaga konsistensi akun.</div>
        </div>

        <div className="card">
          <h3>Preferensi Notifikasi</h3>
          <p className="muted">Notifikasi dipakai untuk info payment, withdraw, chat CS, dan status bot.</p>
          <form className="form" method="post" action="/api/web/profile/notifications">
            <input type="hidden" name="returnTo" value="/app/profile" />
            <label className="toggle-line">
              <input type="checkbox" name="enabled" value="1" defaultChecked={user.notifications_enabled !== false} />
              <span>Aktifkan popup dan push notification</span>
            </label>
            <button className="btn primary" type="submit">Simpan Notifikasi</button>
          </form>
        </div>

        <div className="card">
          <h3>Ganti Password</h3>
          <form className="form" method="post" action="/api/web/profile/password">
            <input type="hidden" name="returnTo" value="/app/profile" />
            <input className="input" type="password" name="oldPassword" placeholder="Password lama" required />
            <input className="input" type="password" name="newPassword" placeholder="Password baru minimal 8 karakter" required />
            <input className="input" type="password" name="confirmPassword" placeholder="Ulangi password baru" required />
            <button className="btn primary" type="submit">Update Password</button>
          </form>
        </div>

        <div className="card">
          <h3>Payout & E-Wallet</h3>
          <div className="stat-list">
            {(ewallets || []).length ? ewallets.map((item) => (
              <div className="mini-line" key={item.id}><span>{item.provider.toUpperCase()} • {item.account_name}</span><b>{item.status}</b></div>
            )) : <p className="muted">Belum ada e-wallet. Tambahkan dari halaman E-Wallet.</p>}
          </div>
          <div className="nav-links" style={{ marginTop: 14 }}>
            <a className="btn" href="/app/ewallet">Kelola E-Wallet</a>
            <a className="btn" href="/app/wallet">Kelola Wallet</a>
          </div>
        </div>

        <div className="card soft-card">
          <h3>Bantuan Cepat</h3>
          <p>Butuh bantuan akun, payment, atau bot? Hubungi CS Telegram resmi Kograph atau buka live chat.</p>
          <div className="nav-links">
            <a className="btn primary" href="https://t.me/Cs_Kograph" target="_blank" rel="noreferrer">Chat @Cs_Kograph</a>
            <a className="btn" href="/app/support">Live Chat</a>
          </div>
          <div className="nav-links" style={{ marginTop: 14 }}>
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
          </div>
        </div>
      </div>
    </>
  );
}
