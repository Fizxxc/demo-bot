import { requireUser } from '../../../lib/auth.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function EwalletPage() {
  const user = await requireUser();
  const { data } = await supabaseAdmin().from('merchant_ewallets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  return (
    <>
      <div className="topbar"><div><h2>Info E-Wallet</h2><p>Tambahkan akun e-wallet. Owner platform akan validasi sebelum bisa dipakai withdraw.</p></div></div>
      <div className="grid two">
        <div className="card"><h3>Tambah E-Wallet</h3><form className="form" method="post" action="/api/web/ewallet/create"><select className="select" name="provider" required><option value="gopay">Gopay</option><option value="dana">Dana</option><option value="shopeepay">Shopeepay</option><option value="ovo">Ovo</option></select><input className="input" name="accountNumber" placeholder="Nomor e-wallet" required /><input className="input" name="accountName" placeholder="Nama pemilik akun" required /><button className="btn primary" type="submit">Kirim Validasi</button></form></div>
        <div className="card"><h3>Status</h3><table className="table"><thead><tr><th>Provider</th><th>Nomor</th><th>Nama</th><th>Status</th></tr></thead><tbody>{(data || []).map((e) => <tr key={e.id}><td>{e.provider}</td><td>{e.account_number}</td><td>{e.account_name}</td><td>{e.status}</td></tr>)}</tbody></table></div>
      </div>
    </>
  );
}
