import { requireUser } from '../../../../lib/auth.js';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';
import { formatRupiah } from '../../../../lib/money.js';

export default async function BillingInvoice({ params, searchParams }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const type = sp?.type === 'merchant_deposit' ? 'merchant_deposit' : 'plan';
  const table = type === 'merchant_deposit' ? 'merchant_deposits' : 'plan_purchases';
  const { data: invoice } = await supabaseAdmin().from(table).select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!invoice) return <main className="container"><div className="card">Invoice tidak ditemukan.</div></main>;
  return (
    <main className="container" style={{ maxWidth: 760, padding: '48px 0' }}>
      <a className="logo" href="/"><span className="logo-mark">⚡</span><span>Kograph Market</span></a>
      <div className="card" style={{ marginTop: 24 }}>
        <span className="badge">{type === 'merchant_deposit' ? 'Invoice deposit' : 'Invoice plan'}</span>
        <h2>{type === 'merchant_deposit' ? 'Deposit Saldo Akun' : `Bayar plan ${invoice.plan_code.toUpperCase()}`}</h2>
        <p>Scan QRIS di bawah. Setelah pembayaran sukses, webhook akan memproses otomatis.</p>
        <div className="grid two">
          <img src={`/api/web/billing/qris/${invoice.id}${type === 'merchant_deposit' ? '?type=merchant_deposit' : ''}`} alt="QRIS" style={{ width: '100%', borderRadius: 24 }} />
          <div>
            <p>Order ID</p><h3><code>{invoice.order_id}</code></h3>
            <p>Nominal</p><h3>{formatRupiah(invoice.amount)}</h3>
            <p>Total bayar</p><h3>{formatRupiah(invoice.total_payment)}</h3>
            <p>Status</p><h3>{invoice.status}</h3>
            <a className="btn primary" href={type === 'merchant_deposit' ? '/app/wallet' : '/app'}>Cek Dashboard</a>
          </div>
        </div>
      </div>
    </main>
  );
}
