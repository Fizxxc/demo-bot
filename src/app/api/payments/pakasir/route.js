import { handleRouteError, json, readJson } from '../../../../lib/http.js';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';
import { getPakasirConfig, getTransactionDetail } from '../../../../lib/pakasir.js';
import { getPlatformTransaction } from '../../../../lib/platformPayments.js';
import { formatRupiah } from '../../../../lib/money.js';
import { getPlan } from '../../../../lib/plans.js';
import { inlineKeyboard, sendMessage } from '../../../../lib/telegram.js';
import { ownerNotify } from '../../../../lib/satsko.js';

export const runtime = 'nodejs';

async function notifyPaid(tenant, customer, amount, newBalance) {
  if (!tenant?.bot_token || !customer?.telegram_user_id) return;
  await sendMessage(
    tenant.bot_token,
    customer.telegram_user_id,
    `✅ <b>Deposit QRIS berhasil!</b>\nSaldo bertambah: <b>${formatRupiah(amount)}</b>\nSaldo sekarang: <b>${formatRupiah(newBalance)}</b>`,
    { reply_markup: inlineKeyboard([[{ text: '🏠 Menu Utama', callback_data: 'menu' }]]) }
  ).catch((err) => console.warn('Gagal kirim notif deposit:', err.message));
}


async function logWebhook(db, payload, { matchedTable = null, matchedId = null, responseStatus = 200, responseBody = {} } = {}) {
  try {
    await db.from('payment_webhook_logs').insert({
      provider: 'pakasir',
      order_id: payload?.order_id || null,
      amount: payload?.amount ? Number(payload.amount) : null,
      project: payload?.project || null,
      status: payload?.status || null,
      payload,
      matched_table: matchedTable,
      matched_id: matchedId,
      response_status: responseStatus,
      response_body: responseBody
    });
  } catch (err) {
    // Jangan sampai logging membuat webhook gagal.
    console.warn('payment_webhook_logs warning:', err.message);
  }
}

async function handleBotCustomerInvoice(db, invoice, payload) {
  const [{ data: tenant, error: tenantError }, { data: customer, error: customerError }] = await Promise.all([
    db.from('tenants').select('*').eq('id', invoice.tenant_id).maybeSingle(),
    db.from('customers').select('*').eq('id', invoice.customer_id).maybeSingle()
  ]);
  if (tenantError) throw tenantError;
  if (customerError) throw customerError;
  if (!tenant) return json({ ok: false, error: 'tenant_not_found' }, 404);

  const pakasirConfig = getPakasirConfig(tenant);
  if (payload.project && pakasirConfig.project && payload.project !== pakasirConfig.project) return json({ ok: false, error: 'project_mismatch' }, 400);
  if (Number(payload.amount) !== Number(invoice.amount)) return json({ ok: false, error: 'amount_mismatch' }, 400);
  if (payload.status !== 'completed') {
    await db.from('payment_invoices').update({ raw: { ...invoice.raw, last_webhook: payload } }).eq('id', invoice.id);
    return json({ ok: true, ignored: true, status: payload.status });
  }

  const detail = await getTransactionDetail(tenant, { orderId: invoice.order_id, amount: invoice.amount });
  if (detail?.status !== 'completed') return json({ ok: false, error: 'transaction_not_completed' }, 409);

  const { data: credit, error: creditError } = await db.rpc('credit_paid_invoice', {
    p_invoice_id: invoice.id,
    p_paid_at: detail.completed_at || payload.completed_at || new Date().toISOString(),
    p_raw: { webhook: payload, detail }
  });
  if (creditError) throw creditError;
  await notifyPaid(tenant, customer, invoice.amount, credit.new_balance);
  return json({ ok: true, type: 'bot_customer_deposit', credited: !credit.already_paid, invoice: invoice.order_id });
}

async function handlePlanPurchase(db, purchase, payload) {
  if (Number(payload.amount) !== Number(purchase.amount)) return json({ ok: false, error: 'amount_mismatch' }, 400);
  if (payload.status !== 'completed') return json({ ok: true, ignored: true, status: payload.status });
  if (purchase.status === 'paid') return json({ ok: true, already_paid: true });

  const detail = await getPlatformTransaction({ orderId: purchase.order_id, amount: purchase.amount });
  if (detail?.status !== 'completed') return json({ ok: false, error: 'transaction_not_completed' }, 409);

  const plan = getPlan(purchase.plan_code);
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await db.from('plan_purchases').update({ status: 'paid', paid_at: detail.completed_at || now.toISOString(), raw: { ...purchase.raw, webhook: payload, detail }, updated_at: now.toISOString() }).eq('id', purchase.id);
  await db.from('web_users').update({ status: 'active', plan_code: purchase.plan_code, plan_started_at: now.toISOString(), plan_expires_at: expires.toISOString(), updated_at: now.toISOString() }).eq('id', purchase.user_id);
  await db.from('merchant_wallets').upsert({ user_id: purchase.user_id }, { onConflict: 'user_id', ignoreDuplicates: true });
  await ownerNotify({ userId: purchase.user_id, type: 'plan_paid', title: 'Plan merchant aktif', message: `Plan ${plan?.name || purchase.plan_code} berhasil dibayar.`, metadata: { purchase_id: purchase.id } });
  return json({ ok: true, type: 'plan_purchase', plan: purchase.plan_code });
}

async function handleMerchantDeposit(db, dep, payload) {
  if (Number(payload.amount) !== Number(dep.amount)) return json({ ok: false, error: 'amount_mismatch' }, 400);
  if (payload.status !== 'completed') return json({ ok: true, ignored: true, status: payload.status });
  if (dep.status === 'paid') return json({ ok: true, already_paid: true });

  const detail = await getPlatformTransaction({ orderId: dep.order_id, amount: dep.amount });
  if (detail?.status !== 'completed') return json({ ok: false, error: 'transaction_not_completed' }, 409);

  const { data: wallet } = await db.from('merchant_wallets').select('*').eq('user_id', dep.user_id).maybeSingle();
  const newBalance = Number(wallet?.available_balance || 0) + Number(dep.amount);
  await db.from('merchant_wallets').upsert({ user_id: dep.user_id, available_balance: newBalance, merchant_balance: Number(wallet?.merchant_balance || 0), lifetime_revenue: Number(wallet?.lifetime_revenue || 0), updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  await db.from('merchant_deposits').update({ status: 'paid', paid_at: detail.completed_at || new Date().toISOString(), raw: { ...dep.raw, webhook: payload, detail }, updated_at: new Date().toISOString() }).eq('id', dep.id);
  return json({ ok: true, type: 'merchant_deposit', new_balance: newBalance });
}

export async function POST(req) {
  try {
    const payload = await readJson(req);
    const orderId = payload.order_id;
    if (!orderId) return json({ ok: false, error: 'order_id kosong' }, 400);

    const db = supabaseAdmin();
    const { data: invoice, error } = await db.from('payment_invoices').select('*').eq('provider', 'pakasir').eq('order_id', orderId).maybeSingle();
    if (error) throw error;
    if (invoice) {
      await logWebhook(db, payload, { matchedTable: 'payment_invoices', matchedId: invoice.id, responseBody: { matched: true, table: 'payment_invoices' } });
      return handleBotCustomerInvoice(db, invoice, payload);
    }

    const { data: purchase, error: purchaseError } = await db.from('plan_purchases').select('*').eq('order_id', orderId).maybeSingle();
    if (purchaseError) throw purchaseError;
    if (purchase) {
      await logWebhook(db, payload, { matchedTable: 'plan_purchases', matchedId: purchase.id, responseBody: { matched: true, table: 'plan_purchases' } });
      return handlePlanPurchase(db, purchase, payload);
    }

    const { data: dep, error: depError } = await db.from('merchant_deposits').select('*').eq('order_id', orderId).maybeSingle();
    if (depError) throw depError;
    if (dep) {
      await logWebhook(db, payload, { matchedTable: 'merchant_deposits', matchedId: dep.id, responseBody: { matched: true, table: 'merchant_deposits' } });
      return handleMerchantDeposit(db, dep, payload);
    }

    const responseBody = {
      ok: true,
      warning: 'invoice_not_found',
      logged: true,
      message: 'Webhook diterima dan disimpan di payment_webhook_logs, tetapi order_id tidak ditemukan di invoice aktif.'
    };
    await logWebhook(db, payload, { responseStatus: 200, responseBody });
    return json(responseBody, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET() {
  return json({ ok: true, message: 'Pakasir webhook endpoint aktif.' });
}
