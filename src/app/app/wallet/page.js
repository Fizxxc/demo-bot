export const dynamic = 'force-dynamic';
import { requireUser } from '../../../lib/auth.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';
import { formatRupiah } from '../../../lib/money.js';
import { getMonthlyLimit, WITHDRAW_FEE_RATE, WITHDRAW_MAX, WITHDRAW_MIN } from '../../../lib/walletRules.js';
import MascotCard from '../../../components/MascotCard.js';

export default async function WalletPage() {
  const user = await requireUser();
  const db = supabaseAdmin();
  const [{ data: wallet }, { data: ewallets }, { data: withdrawals }] = await Promise.all([
    db.from('merchant_wallets').select('*').eq('user_id', user.id).maybeSingle(),
    db.from('merchant_ewallets').select('*').eq('user_id', user.id).eq('status', 'valid'),
    db.from('withdrawals').select('*, merchant_ewallets(provider,account_number,account_name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
  ]);
  return (
    <>
      <div className="topbar"><div><p className="eyebrow">Merchant Wallet</p><h2>Deposit & Withdraw</h2><p>Withdraw hanya hari Sabtu. Biaya layanan {WITHDRAW_FEE_RATE * 100}%. Minimal {formatRupiah(WITHDRAW_MIN)}, maksimal {formatRupiah(WITHDRAW_MAX)} per request.</p></div></div>
      <div className="stats">
        <div className="stat">Saldo Penjualan<strong>{formatRupiah(wallet?.merchant_balance || 0)}</strong></div>
        <div className="stat">Saldo Akun<strong>{formatRupiah(wallet?.available_balance || 0)}</strong></div>
        <div className="stat">Limit Bulanan<strong>{formatRupiah(getMonthlyLimit(user.plan_code))}</strong></div>
        <div className="stat">Fee Withdraw<strong>10%</strong></div>
      </div>
      <div className="grid two" style={{ marginTop: 18 }}>
        <MascotCard
          image="/assets/mascots/profile-thumbs-up.webp"
          title="Wallet lebih nyaman dipakai."
          text="Info saldo, cairkan merchant balance, QRIS deposit, dan withdraw sekarang tersusun lebih rapi."
          badge="Wallet Mascot"
        />
        <div className="card"><h3>Cairkan Saldo Penjualan</h3><p>Pindahkan saldo hasil pembelian bot ke Saldo Akun agar bisa withdraw.</p><form method="post" action="/api/web/wallet/settle"><button className="btn primary" type="submit">Cairkan Semua</button></form></div>
        <div className="card"><h3>Deposit Saldo Akun</h3><form className="form" method="post" action="/api/web/wallet/deposit"><input className="input" name="amount" placeholder="Nominal deposit" required /><button className="btn" type="submit">Buat QRIS Deposit</button></form></div>
      </div>
      <div className="card" style={{ marginTop: 18 }}><h3>Request Withdraw</h3><form className="form" method="post" action="/api/web/wallet/withdraw"><select className="select" name="ewalletId" required><option value="">Pilih e-wallet valid</option>{(ewallets || []).map((e) => <option key={e.id} value={e.id}>{e.provider.toUpperCase()} - {e.account_number} - {e.account_name}</option>)}</select><input className="input" name="amount" placeholder="Nominal withdraw" required /><button className="btn primary" type="submit">Ajukan Withdraw</button></form><p>Net diterima = nominal - 10% biaya layanan.</p></div>
      <div className="card" style={{ marginTop: 18 }}><h3>Riwayat Withdraw</h3><table className="table"><thead><tr><th>Tanggal</th><th>Nominal</th><th>Net</th><th>Status</th></tr></thead><tbody>{(withdrawals || []).map((w) => <tr key={w.id}><td>{new Date(w.created_at).toLocaleString('id-ID')}</td><td>{formatRupiah(w.amount)}</td><td>{formatRupiah(w.net_amount)}</td><td>{w.status}</td></tr>)}</tbody></table></div>
    </>
  );
}
