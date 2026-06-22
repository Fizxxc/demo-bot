import crypto from 'node:crypto';
import { esc } from './html.js';
import { formatRupiah } from './money.js';
import { editMessageText, inlineKeyboard, sendDocumentBuffer, sendMessage } from './telegram.js';

export const SPIN_TIERS = [
  { amount: 1000, chance: 12, label: 'Spin Hemat 1K', desc: 'Peluang kecil, masih bisa zonk.' },
  { amount: 2000, chance: 24, label: 'Spin Mini 2K', desc: 'Peluang lebih baik untuk hadiah ringan.' },
  { amount: 3000, chance: 40, label: 'Spin Plus 3K', desc: 'Peluang sedang dan hadiah lebih menarik.' },
  { amount: 5000, chance: 68, label: 'Spin Max 5K', desc: 'Peluang terbesar dan prioritas hadiah bagus.' }
];

export function spinTierInfo(amount) {
  return SPIN_TIERS.find((tier) => Number(tier.amount) === Number(amount)) || null;
}

function orderFile(accounts, productName) {
  return accounts.map((acc, index) => (
    `Akun #${index + 1}\n` +
    `Produk: ${productName}\n` +
    `Username: ${acc.username}\n` +
    `Password: ${acc.password}\n` +
    `Tipe: ${acc.tipe || '-'}\n` +
    `${acc.extra ? `Catatan: ${acc.extra}\n` : ''}` +
    '---------------------------\n'
  )).join('\n');
}

export async function runSpinAnimation(tenant, chatId) {
  const frames = [
    '🎰 <b>Lucky Spin dimulai...</b>\n\n▰▱▱▱▱ Memutar roda hadiah',
    '🎰 <b>Lucky Spin berjalan...</b>\n\n▰▰▱▱▱ Mengacak peluang',
    '🎰 <b>Lucky Spin berjalan...</b>\n\n▰▰▰▱▱ Mengecek stok hadiah',
    '🎰 <b>Sedikit lagi...</b>\n\n▰▰▰▰▱ Mengunci hasil',
    '🎰 <b>Hasil sudah keluar!</b>\n\n▰▰▰▰▰ Membuka hadiah'
  ];

  let sent;
  try {
    sent = await sendMessage(tenant.bot_token, chatId, frames[0]);
  } catch {
    return;
  }

  for (const frame of frames.slice(1)) {
    await new Promise((resolve) => setTimeout(resolve, 650));
    await editMessageText(tenant.bot_token, chatId, sent.message_id, frame).catch(() => {});
  }
}

export async function fulfillDirectOrderInvoice({ db, tenant, customer, invoice, detail = {} }) {
  if (!tenant?.bot_token || !customer?.telegram_user_id) throw new Error('tenant_or_customer_invalid');

  if (invoice.status === 'paid' && invoice.order_result?.order_id) {
    await sendMessage(
      tenant.bot_token,
      customer.telegram_user_id,
      `✅ Invoice <code>${esc(invoice.order_id)}</code> sudah diproses sebelumnya.`,
      { reply_markup: inlineKeyboard([[{ text: '🏠 Menu Utama', callback_data: 'menu' }]]) }
    ).catch(() => {});
    return { ok: true, already_paid: true, order_id: invoice.order_result.order_id };
  }

  const { data: product, error: productError } = await db
    .from('products')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('id', invoice.product_id)
    .maybeSingle();
  if (productError) throw productError;
  if (!product) throw new Error('product_not_found');

  const { data: accounts, error: accountsError } = await db
    .from('product_accounts')
    .select('id, username, password, tipe, extra')
    .eq('tenant_id', tenant.id)
    .eq('product_id', invoice.product_id)
    .eq('status', 'available')
    .order('created_at', { ascending: true })
    .limit(Number(invoice.qty));
  if (accountsError) throw accountsError;

  if (!accounts || accounts.length < Number(invoice.qty)) {
    await db.from('balances').upsert(
      { tenant_id: tenant.id, customer_id: customer.id, amount: 0 },
      { onConflict: 'customer_id', ignoreDuplicates: true }
    );

    const { data: balance } = await db.from('balances').select('amount').eq('customer_id', customer.id).maybeSingle();
    const newBalance = Number(balance?.amount || 0) + Number(invoice.amount);
    await db.from('balances').update({ amount: newBalance, updated_at: new Date().toISOString() }).eq('customer_id', customer.id);
    await db.from('transactions').insert({
      tenant_id: tenant.id,
      customer_id: customer.id,
      type: 'REFUND',
      amount: Number(invoice.amount),
      description: `Refund QRIS karena stok ${product.name} tidak cukup`,
      meta: { invoice_id: invoice.id, order_id: invoice.order_id }
    });
    await db.from('direct_order_invoices').update({
      status: 'paid',
      paid_at: detail.completed_at || new Date().toISOString(),
      order_result: { refunded_to_balance: true, reason: 'insufficient_stock', new_balance: newBalance },
      raw: { ...(invoice.raw || {}), detail },
      updated_at: new Date().toISOString()
    }).eq('id', invoice.id);

    await sendMessage(
      tenant.bot_token,
      customer.telegram_user_id,
      `⚠️ <b>Pembayaran diterima, tapi stok tidak cukup.</b>\n\nDana <b>${formatRupiah(invoice.amount)}</b> sudah otomatis dikembalikan ke saldo bot kamu.\nSaldo sekarang: <b>${formatRupiah(newBalance)}</b>`,
      { reply_markup: inlineKeyboard([[{ text: '🛍️ Pilih Produk Lain', callback_data: 'products' }], [{ text: '🏠 Menu Utama', callback_data: 'menu' }]]) }
    ).catch(() => {});

    return { ok: true, refunded_to_balance: true, new_balance: newBalance };
  }

  const accountIds = accounts.map((item) => item.id);
  const { data: order, error: orderError } = await db
    .from('orders')
    .insert({ tenant_id: tenant.id, customer_id: customer.id, total_amount: Number(invoice.amount), status: 'paid' })
    .select('*')
    .single();
  if (orderError) throw orderError;

  const { error: updateAccountsError } = await db
    .from('product_accounts')
    .update({ status: 'sold', sold_to_customer_id: customer.id, sold_at: new Date().toISOString() })
    .in('id', accountIds);
  if (updateAccountsError) throw updateAccountsError;

  const { error: itemError } = await db.from('order_items').insert({
    tenant_id: tenant.id,
    order_id: order.id,
    product_id: invoice.product_id,
    qty: Number(invoice.qty),
    unit_price: Number(product.price),
    accounts
  });
  if (itemError) throw itemError;

  await db.from('transactions').insert({
    tenant_id: tenant.id,
    customer_id: customer.id,
    type: 'BELI',
    amount: Number(invoice.amount),
    description: `QRIS ${product.name} x${invoice.qty}`,
    meta: { order_id: order.id, invoice_id: invoice.id, pay_method: 'qris' }
  });

  const result = {
    order_id: order.id,
    product_id: product.id,
    product_name: product.name,
    qty: Number(invoice.qty),
    accounts,
    total_amount: Number(invoice.amount)
  };

  await db.from('direct_order_invoices').update({
    status: 'paid',
    paid_at: detail.completed_at || new Date().toISOString(),
    order_result: result,
    raw: { ...(invoice.raw || {}), detail },
    updated_at: new Date().toISOString()
  }).eq('id', invoice.id);

  await sendDocumentBuffer(
    tenant.bot_token,
    customer.telegram_user_id,
    Buffer.from(orderFile(accounts, product.name), 'utf8'),
    `akun-${order.id}.txt`,
    `📦 Pembelian <b>${esc(product.name)}</b> x${invoice.qty} via QRIS berhasil!`
  ).catch((err) => console.warn('send direct order document failed:', err.message));

  await sendMessage(
    tenant.bot_token,
    customer.telegram_user_id,
    `✅ <b>Order QRIS sukses!</b>\n🧾 Invoice: <code>${esc(invoice.order_id)}</code>\n💸 Total: <b>${formatRupiah(invoice.amount)}</b>`,
    { reply_markup: inlineKeyboard([[{ text: '🛍️ Beli Lagi', callback_data: 'products' }], [{ text: '🏠 Menu Utama', callback_data: 'menu' }]]) }
  ).catch(() => {});

  return { ok: true, ...result };
}

export async function resolveSpinOrder({ db, tenant, customer, spinOrder, detail = {} }) {
  if (!tenant?.bot_token || !customer?.telegram_user_id) throw new Error('tenant_or_customer_invalid');

  if (spinOrder.status === 'paid' && spinOrder.result) {
    await sendMessage(tenant.bot_token, customer.telegram_user_id, '✅ Spin ini sudah diproses sebelumnya.', { reply_markup: inlineKeyboard([[{ text: '🎰 Spin Lagi', callback_data: 'spin' }]]) }).catch(() => {});
    return { ok: true, already_paid: true, result: spinOrder.result };
  }

  const tier = spinTierInfo(spinOrder.tier_amount);
  if (!tier) throw new Error('invalid_spin_tier');

  await runSpinAnimation(tenant, customer.telegram_user_id);

  const shouldWin = crypto.randomInt(100) < tier.chance;
  let prize = null;

  if (shouldWin) {
    const { data: prizes, error: prizeError } = await db
      .from('spin_prizes')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('status', 'available')
      .lte('tier_min', Number(spinOrder.tier_amount))
      .limit(80);
    if (prizeError) throw prizeError;
    if (prizes?.length) prize = prizes[crypto.randomInt(prizes.length)];
  }

  const now = new Date().toISOString();

  if (!prize) {
    await db.from('spin_orders').update({
      status: 'paid',
      result: 'zonk',
      raw: { ...(spinOrder.raw || {}), detail },
      resolved_at: now,
      updated_at: now
    }).eq('id', spinOrder.id);

    await db.from('transactions').insert({
      tenant_id: tenant.id,
      customer_id: customer.id,
      type: 'BELI',
      amount: Number(spinOrder.tier_amount),
      description: `${tier.label} - ZONK`,
      meta: { spin_order_id: spinOrder.id, result: 'zonk', pay_method: spinOrder.pay_method }
    });

    await sendMessage(
      tenant.bot_token,
      customer.telegram_user_id,
      `😵 <b>ZONK!</b>\n\nBelum beruntung di <b>${esc(tier.label)}</b>.\nKamu bisa coba tier yang lebih tinggi untuk peluang lebih besar.`,
      { reply_markup: inlineKeyboard([[{ text: '🎰 Spin Lagi', callback_data: 'spin' }], [{ text: '🏠 Menu Utama', callback_data: 'menu' }]]) }
    ).catch(() => {});

    return { ok: true, result: 'zonk' };
  }

  await db.from('spin_prizes').update({
    status: 'won',
    won_by_customer_id: customer.id,
    won_spin_order_id: spinOrder.id,
    won_at: now
  }).eq('id', prize.id).eq('status', 'available');

  await db.from('spin_orders').update({
    status: 'paid',
    result: 'win',
    prize_id: prize.id,
    raw: { ...(spinOrder.raw || {}), detail },
    resolved_at: now,
    updated_at: now
  }).eq('id', spinOrder.id);

  await db.from('transactions').insert({
    tenant_id: tenant.id,
    customer_id: customer.id,
    type: 'BELI',
    amount: Number(spinOrder.tier_amount),
    description: `${tier.label} - WIN ${prize.name}`,
    meta: { spin_order_id: spinOrder.id, prize_id: prize.id, result: 'win', pay_method: spinOrder.pay_method }
  });

  const rewardText =
    `HADIAH LUCKY SPIN\n` +
    `Order: ${spinOrder.order_id || spinOrder.id}\n` +
    `Tier: ${tier.label}\n` +
    `Hadiah: ${prize.name}\n\n` +
    `${prize.reward_text}\n\n` +
    `${prize.note ? `Catatan: ${prize.note}\n` : ''}` +
    `Tanggal: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n`;

  await sendDocumentBuffer(
    tenant.bot_token,
    customer.telegram_user_id,
    Buffer.from(rewardText, 'utf8'),
    `hadiah-spin-${spinOrder.order_id || spinOrder.id}.txt`,
    `🎉 <b>SELAMAT!</b> Kamu mendapatkan <b>${esc(prize.name)}</b>. Hadiah dikirim sebagai file.`
  ).catch((err) => console.warn('send spin reward failed:', err.message));

  await sendMessage(
    tenant.bot_token,
    customer.telegram_user_id,
    `🎉 <b>WIN!</b>\n\nHadiah: <b>${esc(prize.name)}</b>\nTier: <b>${esc(tier.label)}</b>\n\nCek file hadiah yang baru dikirim ya.`,
    { reply_markup: inlineKeyboard([[{ text: '🎰 Spin Lagi', callback_data: 'spin' }], [{ text: '🏠 Menu Utama', callback_data: 'menu' }]]) }
  ).catch(() => {});

  return { ok: true, result: 'win', prize };
}
