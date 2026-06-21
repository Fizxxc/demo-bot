export const dynamic = 'force-dynamic';
import { requireUser } from '../../../lib/auth.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';
import MascotCard from '../../../components/MascotCard.js';

export default async function EwalletPage() {
  const user = await requireUser();
  const { data, error } = await supabaseAdmin().from('merchant_ewallets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Withdraw Identity</p>
          <h2>Info E-Wallet</h2>
          <p>Tambahkan akun e-wallet. Owner platform akan validasi sebelum bisa dipakai withdraw.</p>
        </div>
        <a className="btn" href="https://t.me/Cs_Kograph" target="_blank" rel="noreferrer">Bantuan CS</a>
      </div>
      {error && <div className="notice">Gagal membaca data e-wallet: {error.message}</div>}
      <div className="grid two">
        <MascotCard
          image="/assets/mascots/wave-hello.webp"
          title="Lengkapi identitas payout."
          text="Maskot menyambut merchant saat menambahkan akun payout agar alurnya terasa lebih ramah dan jelas."
          badge="E-Wallet Mascot"
        />
        <div className="card">
          <h3>Tambah E-Wallet</h3>
          <form className="form" method="post" action="/api/web/ewallet/create">
            <select className="select" name="provider" required>
              <option value="gopay">Gopay</option>
              <option value="dana">Dana</option>
              <option value="shopeepay">Shopeepay</option>
              <option value="ovo">Ovo</option>
            </select>
            <input className="input" name="accountNumber" placeholder="Nomor e-wallet" required />
            <input className="input" name="accountName" placeholder="Nama pemilik akun" required />
            <button className="btn primary" type="submit">Kirim Validasi</button>
          </form>
          <div className="notice-mini">Pastikan nama dan nomor benar. Withdraw hanya bisa memakai e-wallet berstatus valid.</div>
        </div>
        <div className="card">
          <h3>Status Validasi</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Provider</th><th>Nomor</th><th>Nama</th><th>Status</th><th>Tanggal</th></tr></thead>
              <tbody>
                {(data || []).map((e) => <tr key={e.id}><td>{e.provider}</td><td>{e.account_number}</td><td>{e.account_name}</td><td><span className={e.status === 'valid' ? 'pill good' : 'pill'}>{e.status}</span></td><td>{new Date(e.created_at).toLocaleString('id-ID')}</td></tr>)}
                {!data?.length && <tr><td colSpan="5" className="muted">Belum ada e-wallet. Tambahkan dulu untuk validasi.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
