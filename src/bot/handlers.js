import crypto from 'node:crypto';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { esc } from '../lib/html.js';
import { formatRupiah, parseNominal } from '../lib/money.js';
import {
  answerCallbackQuery,
  editMessageText,
  inlineKeyboard,
  sendDocumentBuffer,
  sendMessage,
  sendPhotoBuffer
} from '../lib/telegram.js';
import { cancelTransaction, createQrisTransaction, getPakasirConfig, getTransactionDetail } from '../lib/pakasir.js';
import { generateQrisImage } from '../lib/qrisImage.js';

const DEPOSIT_PRESETS = [10000, 25000, 50000, 100000];

function randomOrderId(tenantId) {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const shard = String(tenantId).replace(/-/g, '').slice(0, 6).toUpperCase();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `DEP${date}${shard}${rand}`;
}

function mainKeyboard(isOwner = false) {
  const rows = [
    [
      { text: '🛍️ List Produk', callback_data: 'products' },
      { text: '📦 Cek Stok', callback_data: 'stock' }
    ],
    [
      { text: '💰 Deposit QRIS', callback_data: 'deposit' },
      { text: '📜 Riwayat', callback_data: 'history' }
    ],
    [{ text: 'ℹ️ Info Bot', callback_data: 'info' }]
  ];

  if (isOwner) rows.push([{ text: '👑 Admin Panel', callback_data: 'admin' }]);
  return inlineKeyboard(rows);
}

function productQtyKeyboard(qty) {
  return inlineKeyboard([
    [
      { text: '➖', callback_data: 'qty:-' },
      { text: `Jumlah: ${qty}`, callback_data: 'noop' },
      { text: '➕', callback_data: 'qty:+' }
    ],
    [{ text: '✅ Konfirmasi Order', callback_data: 'buy:confirm' }],
    [{ text: '🔙 Kembali', callback_data: 'products' }]
  ]);
}

function depositKeyboard() {
  return inlineKeyboard([
    DEPOSIT_PRESETS.map((amount) => ({ text: `💳 ${formatRupiah(amount)}`, callback_data: `deposit:${amount}` })),
    [{ text: '🔧 Custom Nominal', callback_data: 'deposit:custom' }],
    [{ text: '🏠 Menu Utama', callback_data: 'menu' }]
  ]);
}

function invoiceKeyboard(invoiceId) {
  return inlineKeyboard([
    [{ text: '🔁 Cek Pembayaran', callback_data: `paycheck:${invoiceId}` }],
    [{ text: '❌ Batalkan Invoice', callback_data: `paycancel:${invoiceId}` }],
    [{ text: '🏠 Menu Utama', callback_data: 'menu' }]
  ]);
}

function ownerId(tenant) {
  return Number(tenant.owner_telegram_id || 0);
}

async function ensureCustomer(tenant, from) {
  const db = supabaseAdmin();
  const telegramId = Number(from.id);

  const payload = {
    tenant_id: tenant.id,
    telegram_user_id: telegramId,
    username: from.username || null,
    full_name: [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || String(telegramId)
  };

  const { data: customer, error } = await db
    .from('customers')
    .upsert(payload, { onConflict: 'tenant_id,telegram_user_id' })
    .select('*')
    .single();

  if (error) throw error;

  const { error: balanceError } = await db
    .from('balances')
    .upsert({ tenant_id: tenant.id, customer_id: customer.id, amount: 0 }, { onConflict: 'customer_id', ignoreDuplicates: true });

  if (balanceError) throw balanceError;

  return customer;
}

async function getBalance(customerId) {
  const { data, error } = await supabaseAdmin()
    .from('balances')
    .select('amount')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.amount || 0);
}

async function getStats(tenant, customer) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('transactions')
    .select('amount')
    .eq('tenant_id', tenant.id)
    .eq('customer_id', customer.id)
    .eq('type', 'BELI');

  if (error) throw error;
  const totalNominal = (data || []).reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
  return { count: data?.length || 0, totalNominal };
}

async function setSession(tenant, telegramUserId, state, data = {}) {
  const { error } = await supabaseAdmin()
    .from('bot_sessions')
    .upsert(
      {
        tenant_id: tenant.id,
        telegram_user_id: Number(telegramUserId),
        state,
        data,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'tenant_id,telegram_user_id' }
    );

  if (error) throw error;
}

async function getSession(tenant, telegramUserId) {
  const { data, error } = await supabaseAdmin()
    .from('bot_sessions')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('telegram_user_id', Number(telegramUserId))
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function clearSession(tenant, telegramUserId) {
  await supabaseAdmin()
    .from('bot_sessions')
    .delete()
    .eq('tenant_id', tenant.id)
    .eq('telegram_user_id', Number(telegramUserId));
}

async function sendMenu(tenant, chatId, from, customer) {
  const balance = await getBalance(customer.id);
  const stats = await getStats(tenant, customer);
  const isOwner = Number(from.id) === ownerId(tenant);

  const text =
    `👋 <b>Selamat datang di ${esc(tenant.store_name || 'Kograph Market')}!</b>\n\n` +
    `🧑 Nama: <b>${esc(customer.full_name)}</b>\n` +
    `🆔 ID: <code>${from.id}</code>\n` +
    `💰 Saldo: <b>${formatRupiah(balance)}</b>\n` +
    `🛒 Total Transaksi: <b>${stats.count}</b>\n` +
    `💸 Total Belanja: <b>${formatRupiah(stats.totalNominal)}</b>\n\n` +
    `Pilih menu di bawah ini 👇`;

  await sendMessage(tenant.bot_token, chatId, text, { reply_markup: mainKeyboard(isOwner) });
}

async function editOrSend(tenant, query, text, replyMarkup) {
  if (query?.message?.message_id) {
    try {
      return await editMessageText(tenant.bot_token, query.message.chat.id, query.message.message_id, text, { reply_markup: replyMarkup });
    } catch (err) {
      // Jika pesan asal adalah foto atau sudah tidak bisa diedit, kirim pesan baru.
      return sendMessage(tenant.bot_token, query.from.id, text, { reply_markup: replyMarkup });
    }
  }

  return sendMessage(tenant.bot_token, query.from.id, text, { reply_markup: replyMarkup });
}

async function listProducts(tenant, query) {
  const { data: products, error } = await supabaseAdmin()
    .from('product_stock')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .order('code', { ascending: true });

  if (error) throw error;

  if (!products?.length) {
    return editOrSend(
      tenant,
      query,
      '🛍️ <b>List Produk</b>\n\nBelum ada produk aktif. Owner bisa menambahkan produk dari Supabase.',
      inlineKeyboard([[{ text: '🏠 Menu Utama', callback_data: 'menu' }]])
    );
  }

  const rows = products.map((product) => [
    {
      text: `${Number(product.stock || 0) > 0 ? '🟢' : '🔴'} ${product.code}. ${product.name} • ${formatRupiah(product.price)}`,
      callback_data: Number(product.stock || 0) > 0 ? `product:${product.id}` : 'noop'
    }
  ]);
  rows.push([{ text: '🏠 Menu Utama', callback_data: 'menu' }]);

  const text =
    '🛍️ <b>LIST PRODUK</b>\n\n' +
    products.map((p) => `${Number(p.stock || 0) > 0 ? '✅' : '❌'} <b>${esc(p.code)}.</b> ${esc(p.name)} — ${formatRupiah(p.price)} — stok <b>${p.stock}</b>`).join('\n') +
    '\n\nTap produk untuk membeli.';

  return editOrSend(tenant, query, text, inlineKeyboard(rows));
}

async function stockInfo(tenant, query) {
  const { data: products, error } = await supabaseAdmin()
    .from('product_stock')
    .select('code,name,stock,is_active')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .order('code', { ascending: true });

  if (error) throw error;

  const now = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date());
  const text =
    `📦 <b>Informasi Stok</b>\n🕒 ${esc(now)} WIB\n\n` +
    (products?.length
      ? products.map((p) => `${Number(p.stock || 0) > 0 ? '✅' : '❌'} <b>${esc(p.code)}.</b> ${esc(p.name)} ➜ <b>${p.stock}x</b>`).join('\n')
      : 'Produk belum tersedia.');

  return editOrSend(tenant, query, text, inlineKeyboard([[{ text: '🛍️ List Produk', callback_data: 'products' }], [{ text: '🏠 Menu Utama', callback_data: 'menu' }]]));
}

async function showProduct(tenant, query, productId) {
  const { data: product, error } = await supabaseAdmin()
    .from('product_stock')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('id', productId)
    .maybeSingle();

  if (error) throw error;
  if (!product || !product.is_active) {
    return editOrSend(tenant, query, '❌ Produk tidak ditemukan.', inlineKeyboard([[{ text: '🔙 Kembali', callback_data: 'products' }]]));
  }

  const stock = Number(product.stock || 0);
  if (stock <= 0) {
    return editOrSend(tenant, query, '❌ Produk ini sedang kosong.', inlineKeyboard([[{ text: '🔙 Kembali', callback_data: 'products' }]]));
  }

  await setSession(tenant, query.from.id, 'ORDERING', { productId, qty: 1 });

  const text =
    '🛒 <b>KONFIRMASI PESANAN</b>\n' +
    '╭────────────────────\n' +
    `│ Produk: <b>${esc(product.name)}</b>\n` +
    `│ Kode: <code>${esc(product.code)}</code>\n` +
    `│ Harga satuan: <b>${formatRupiah(product.price)}</b>\n` +
    `│ Stok tersedia: <b>${stock}</b>\n` +
    '├────────────────────\n' +
    '│ Jumlah Pesanan: <b>x1</b>\n' +
    `│ Total Pembayaran: <b>${formatRupiah(product.price)}</b>\n` +
    '╰────────────────────';

  return editOrSend(tenant, query, text, productQtyKeyboard(1));
}

async function updateQty(tenant, query, op) {
  const session = await getSession(tenant, query.from.id);
  const productId = session?.data?.productId;
  const currentQty = Number(session?.data?.qty || 1);

  if (!productId) {
    await answerCallbackQuery(tenant.bot_token, query.id, 'Data pesanan tidak ditemukan', { show_alert: true });
    return;
  }

  const { data: product, error } = await supabaseAdmin()
    .from('product_stock')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('id', productId)
    .maybeSingle();

  if (error) throw error;
  if (!product) return;

  const stock = Number(product.stock || 0);
  let qty = currentQty;
  if (op === '+') qty = Math.min(currentQty + 1, stock);
  if (op === '-') qty = Math.max(currentQty - 1, 1);

  await setSession(tenant, query.from.id, 'ORDERING', { productId, qty });

  const text =
    '🛒 <b>KONFIRMASI PESANAN</b>\n' +
    '╭────────────────────\n' +
    `│ Produk: <b>${esc(product.name)}</b>\n` +
    `│ Kode: <code>${esc(product.code)}</code>\n` +
    `│ Harga satuan: <b>${formatRupiah(product.price)}</b>\n` +
    `│ Stok tersedia: <b>${stock}</b>\n` +
    '├────────────────────\n' +
    `│ Jumlah Pesanan: <b>x${qty}</b>\n` +
    `│ Total Pembayaran: <b>${formatRupiah(Number(product.price) * qty)}</b>\n` +
    '╰────────────────────';

  return editOrSend(tenant, query, text, productQtyKeyboard(qty));
}

async function confirmOrder(tenant, query) {
  const session = await getSession(tenant, query.from.id);
  const productId = session?.data?.productId;
  const qty = Number(session?.data?.qty || 1);

  if (!productId) {
    return editOrSend(tenant, query, '❌ Data pesanan tidak ditemukan. Silakan pilih produk ulang.', inlineKeyboard([[{ text: '🛍️ List Produk', callback_data: 'products' }]]));
  }

  const { data: result, error } = await supabaseAdmin().rpc('purchase_product', {
    p_tenant_id: tenant.id,
    p_telegram_user_id: Number(query.from.id),
    p_product_id: productId,
    p_qty: qty
  });

  if (error) throw error;

  if (!result?.ok) {
    const reason = result?.reason || 'order_failed';
    const map = {
      insufficient_balance: '❌ Saldo kamu tidak cukup untuk menyelesaikan pesanan.',
      insufficient_stock: '❌ Stok tidak mencukupi.',
      product_not_found: '❌ Produk tidak ditemukan.',
      customer_not_found: '❌ Customer belum terdaftar. Ketik /start dulu.'
    };

    const rows = reason === 'insufficient_balance'
      ? [[{ text: '💰 Deposit Saldo', callback_data: 'deposit' }], [{ text: '🏠 Menu Utama', callback_data: 'menu' }]]
      : [[{ text: '🛍️ List Produk', callback_data: 'products' }]];

    return editOrSend(tenant, query, map[reason] || `❌ Order gagal: ${esc(reason)}`, inlineKeyboard(rows));
  }

  await clearSession(tenant, query.from.id);

  const accounts = result.accounts || [];
  const fileText = accounts.map((acc, index) => (
    `Akun #${index + 1}\n` +
    `Produk: ${result.product_name}\n` +
    `Username: ${acc.username}\n` +
    `Password: ${acc.password}\n` +
    `Tipe: ${acc.tipe || '-'}\n` +
    `${acc.extra ? `Catatan: ${acc.extra}\n` : ''}` +
    '---------------------------\n'
  )).join('\n');

  await sendDocumentBuffer(
    tenant.bot_token,
    query.from.id,
    Buffer.from(fileText, 'utf8'),
    `akun-${result.order_id}.txt`,
    `📦 Pembelian <b>${esc(result.product_name)}</b> x${result.qty} berhasil!\nSisa saldo: <b>${formatRupiah(result.remaining_balance)}</b>`
  );

  await sendMessage(
    tenant.bot_token,
    query.from.id,
    `✅ <b>Order sukses!</b>\n🧾 Invoice: <code>${esc(result.order_id)}</code>\n💸 Total: <b>${formatRupiah(result.total_amount)}</b>`,
    { reply_markup: mainKeyboard(Number(query.from.id) === ownerId(tenant)) }
  );
}

async function showDeposit(tenant, query) {
  await clearSession(tenant, query.from.id);
  const config = getPakasirConfig(tenant);
  const configured = Boolean(config.project && config.apiKey);

  const text = configured
    ? '💰 <b>Deposit Saldo via QRIS</b>\n\nPilih nominal deposit. QRIS otomatis dibuat oleh Pakasir dan saldo masuk setelah pembayaran berhasil.'
    : '⚠️ <b>Pakasir belum dikonfigurasi.</b>\n\nIsi credential Pakasir pada tenant atau ENV <code>PAKASIR_PROJECT_SLUG</code> dan <code>PAKASIR_API_KEY</code>.';

  const markup = configured ? depositKeyboard() : inlineKeyboard([[{ text: '🏠 Menu Utama', callback_data: 'menu' }]]);
  return editOrSend(tenant, query, text, markup);
}

async function createDeposit(tenant, customer, chatId, amount) {
  if (amount < 1000) {
    return sendMessage(tenant.bot_token, chatId, '❌ Minimal deposit adalah Rp1.000.', { reply_markup: depositKeyboard() });
  }

  const orderId = randomOrderId(tenant.id);
  const payment = await createQrisTransaction(tenant, { orderId, amount });
  const qrImage = await generateQrisImage(payment.payment_number);

  const { data: invoice, error } = await supabaseAdmin()
    .from('payment_invoices')
    .insert({
      tenant_id: tenant.id,
      customer_id: customer.id,
      provider: 'pakasir',
      order_id: orderId,
      amount,
      fee: Number(payment.fee || 0),
      total_payment: Number(payment.total_payment || amount),
      payment_method: payment.payment_method || 'qris',
      payment_number: payment.payment_number || null,
      status: 'pending',
      expired_at: payment.expired_at || null,
      raw: payment
    })
    .select('*')
    .single();

  if (error) throw error;

  const expiredText = invoice.expired_at
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(invoice.expired_at)) + ' WIB'
    : '-';

  const caption =
    '💳 <b>Invoice Deposit QRIS</b>\n\n' +
    `🧾 Order ID: <code>${esc(orderId)}</code>\n` +
    `💰 Saldo Masuk: <b>${formatRupiah(amount)}</b>\n` +
    `🏦 Total Bayar: <b>${formatRupiah(invoice.total_payment)}</b>\n` +
    `⏳ Expired: <b>${esc(expiredText)}</b>\n\n` +
    'Scan QRIS pada gambar ini. Setelah bayar, tekan <b>Cek Pembayaran</b> atau tunggu notifikasi otomatis.';

  await sendPhotoBuffer(tenant.bot_token, chatId, qrImage, caption, { reply_markup: invoiceKeyboard(invoice.id) });
}

async function handleDepositAmount(tenant, query, amountText, customer) {
  if (amountText === 'custom') {
    await setSession(tenant, query.from.id, 'AWAITING_DEPOSIT_CUSTOM', {});
    return editOrSend(
      tenant,
      query,
      '🔧 <b>Custom Nominal</b>\n\nKetik jumlah deposit yang kamu inginkan. Contoh: <code>25000</code>\n\nKetik /start untuk batal.',
      inlineKeyboard([[{ text: '❌ Batalkan', callback_data: 'deposit' }]])
    );
  }

  const amount = Number(amountText);
  await editOrSend(tenant, query, `⏳ Membuat invoice QRIS ${formatRupiah(amount)}...`, undefined);
  await createDeposit(tenant, customer, query.from.id, amount);
}

async function checkPayment(tenant, query, invoiceId, silent = false) {
  const db = supabaseAdmin();
  const { data: invoice, error } = await db
    .from('payment_invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (error) throw error;
  if (!invoice) {
    return answerCallbackQuery(tenant.bot_token, query.id, 'Invoice tidak ditemukan', { show_alert: true });
  }

  if (invoice.status === 'paid') {
    await answerCallbackQuery(tenant.bot_token, query.id, 'Invoice sudah dibayar ✅', { show_alert: true });
    return;
  }

  const detail = await getTransactionDetail(tenant, { orderId: invoice.order_id, amount: invoice.amount });
  if (detail?.status !== 'completed') {
    if (!silent) {
      await answerCallbackQuery(tenant.bot_token, query.id, 'Pembayaran belum masuk. Coba lagi sebentar ya.', { show_alert: true });
    }
    return;
  }

  const { data: credit, error: creditError } = await db.rpc('credit_paid_invoice', {
    p_invoice_id: invoice.id,
    p_paid_at: detail.completed_at || new Date().toISOString(),
    p_raw: detail
  });

  if (creditError) throw creditError;

  await answerCallbackQuery(tenant.bot_token, query.id, 'Pembayaran berhasil ✅', { show_alert: true });
  await sendMessage(
    tenant.bot_token,
    query.from.id,
    `✅ <b>Deposit berhasil!</b>\nSaldo bertambah: <b>${formatRupiah(invoice.amount)}</b>\nSaldo sekarang: <b>${formatRupiah(credit.new_balance)}</b>`,
    { reply_markup: mainKeyboard(Number(query.from.id) === ownerId(tenant)) }
  );
}

async function cancelPayment(tenant, query, invoiceId) {
  const db = supabaseAdmin();
  const { data: invoice, error } = await db
    .from('payment_invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (error) throw error;
  if (!invoice) return;

  if (invoice.status !== 'pending') {
    return answerCallbackQuery(tenant.bot_token, query.id, 'Invoice tidak bisa dibatalkan.', { show_alert: true });
  }

  try {
    await cancelTransaction(tenant, { orderId: invoice.order_id, amount: invoice.amount });
  } catch (err) {
    console.warn('Pakasir cancel warning:', err.message);
  }

  await db.from('payment_invoices').update({ status: 'canceled' }).eq('id', invoice.id);

  return editOrSend(tenant, query, '✅ Invoice deposit sudah dibatalkan.', inlineKeyboard([[{ text: '🏠 Menu Utama', callback_data: 'menu' }]]));
}

async function history(tenant, query, customer) {
  const { data, error } = await supabaseAdmin()
    .from('transactions')
    .select('type,amount,description,created_at')
    .eq('tenant_id', tenant.id)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  const text =
    '📜 <b>Riwayat Transaksi</b>\n\n' +
    (data?.length
      ? data.map((trx) => {
          const dt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(trx.created_at));
          const icon = trx.type === 'DEPOSIT' ? '💰' : '🛒';
          return `${icon} <b>${esc(trx.type)}</b> • ${formatRupiah(trx.amount)}\n${esc(trx.description || '-')}\n<code>${esc(dt)} WIB</code>`;
        }).join('\n\n')
      : 'Belum ada transaksi.');

  return editOrSend(tenant, query, text, inlineKeyboard([[{ text: '🏠 Menu Utama', callback_data: 'menu' }]]));
}

async function infoBot(tenant, query) {
  const text =
    'ℹ️ <b>INFORMASI BOT</b>\n' +
    '╭────────────────────\n' +
    `│ Nama Bot: <b>${esc(tenant.store_name || 'Kograph Market')}</b>\n` +
    '│ Fungsi: Auto order produk digital\n' +
    '│ Payment: Pakasir QRIS otomatis\n' +
    '│ Teknologi: Node.js + Next.js + Supabase\n' +
    '╰────────────────────\n\n' +
    'Bot ini mendukung multi-tenant, jadi satu script dapat dipakai banyak owner bot.';

  return editOrSend(tenant, query, text, inlineKeyboard([[{ text: '🏠 Menu Utama', callback_data: 'menu' }]]));
}

function adminKeyboard() {
  return inlineKeyboard([
    [
      { text: '➕ Add Product', callback_data: 'admin:addproduct' },
      { text: '📥 Add Stock', callback_data: 'admin:addstock' }
    ],
    [
      { text: '🧰 Kelola Produk', callback_data: 'admin:products' },
      { text: '📢 Broadcast', callback_data: 'admin:broadcast' }
    ],
    [
      { text: '👥 Data User', callback_data: 'admin:users' },
      { text: '💵 Atur Saldo', callback_data: 'admin:balance' }
    ],
    [
      { text: '🧾 Pending Invoice', callback_data: 'admin:pending' },
      { text: '🏠 Menu Utama', callback_data: 'menu' }
    ]
  ]);
}

function adminBackKeyboard() {
  return inlineKeyboard([[{ text: '👑 Admin Panel', callback_data: 'admin' }], [{ text: '🏠 Menu Utama', callback_data: 'menu' }]]);
}

function ownerOnly(tenant, from) {
  return Number(from.id) === ownerId(tenant);
}

function parsePipeLine(text, minParts = 2) {
  const parts = String(text || '').split('|').map((item) => item.trim());
  if (parts.length < minParts) return null;
  if (parts.slice(0, minParts).some((item) => !item)) return null;
  return parts;
}

async function adminPanel(tenant, query) {
  if (!ownerOnly(tenant, query.from)) {
    return answerCallbackQuery(tenant.bot_token, query.id, 'Khusus owner bot.', { show_alert: true });
  }

  const db = supabaseAdmin();
  const [customers, orders, invoices, balances, products] = await Promise.all([
    db.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    db.from('orders').select('id,total_amount', { count: 'exact' }).eq('tenant_id', tenant.id).eq('status', 'paid'),
    db.from('payment_invoices').select('id,amount,status', { count: 'exact' }).eq('tenant_id', tenant.id).eq('status', 'pending'),
    db.from('balances').select('amount').eq('tenant_id', tenant.id),
    db.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id)
  ]);

  const totalOrder = (orders.data || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const totalBalance = (balances.data || []).reduce((sum, b) => sum + Number(b.amount || 0), 0);

  const text =
    '👑 <b>OWNER CONTROL CENTER</b>\n' +
    '╭────────────────────\n' +
    `│ 🏪 Store: <b>${esc(tenant.store_name || 'Kograph Market')}</b>\n` +
    `│ 🤖 Bot: <b>@${esc(tenant.bot_username || '-')}</b>\n` +
    `│ 👥 User: <b>${customers.count || 0}</b>\n` +
    `│ 🧰 Produk: <b>${products.count || 0}</b>\n` +
    `│ 🛒 Order Sukses: <b>${orders.count || 0}</b>\n` +
    `│ 💸 Omzet: <b>${formatRupiah(totalOrder)}</b>\n` +
    `│ 💰 Total Saldo User: <b>${formatRupiah(totalBalance)}</b>\n` +
    `│ ⏳ Pending Invoice: <b>${invoices.count || 0}</b>\n` +
    '╰────────────────────\n\n' +
    'Pilih fitur owner di bawah ini. Semua data tersimpan ke Supabase dan nanti bisa dipakai juga oleh web dashboard.';

  return editOrSend(tenant, query, text, adminKeyboard());
}

async function adminProductList(tenant, query) {
  if (!ownerOnly(tenant, query.from)) return;

  const { data: products, error } = await supabaseAdmin()
    .from('product_stock')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  if (!products?.length) {
    return editOrSend(
      tenant,
      query,
      '🧰 <b>Kelola Produk</b>\n\nBelum ada produk. Tekan tombol <b>Add Product</b> untuk membuat produk pertama.',
      inlineKeyboard([[{ text: '➕ Add Product', callback_data: 'admin:addproduct' }], [{ text: '👑 Admin Panel', callback_data: 'admin' }]])
    );
  }

  const text =
    '🧰 <b>KELOLA PRODUK</b>\n\n' +
    products.map((p) => `${p.is_active ? '🟢' : '⚫'} <b>${esc(p.code)}</b> — ${esc(p.name)}\n💸 ${formatRupiah(p.price)} • 📦 stok <b>${p.stock}</b>`).join('\n\n') +
    '\n\nTap produk untuk edit harga, tambah stok, atau aktif/nonaktifkan.';

  const rows = products.slice(0, 40).map((p) => [{
    text: `${p.is_active ? '🟢' : '⚫'} ${p.code}. ${p.name}`.slice(0, 60),
    callback_data: `admin:product:${p.id}`
  }]);
  rows.push([{ text: '➕ Add Product', callback_data: 'admin:addproduct' }]);
  rows.push([{ text: '👑 Admin Panel', callback_data: 'admin' }]);

  return editOrSend(tenant, query, text, inlineKeyboard(rows));
}

async function adminProductMenu(tenant, query, productId) {
  if (!ownerOnly(tenant, query.from)) return;

  const { data: product, error } = await supabaseAdmin()
    .from('product_stock')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('id', productId)
    .maybeSingle();

  if (error) throw error;
  if (!product) return editOrSend(tenant, query, '❌ Produk tidak ditemukan.', adminBackKeyboard());

  const text =
    '🧰 <b>DETAIL PRODUK OWNER</b>\n' +
    '╭────────────────────\n' +
    `│ Status: <b>${product.is_active ? 'Aktif 🟢' : 'Nonaktif ⚫'}</b>\n` +
    `│ Kode: <code>${esc(product.code)}</code>\n` +
    `│ Nama: <b>${esc(product.name)}</b>\n` +
    `│ Harga: <b>${formatRupiah(product.price)}</b>\n` +
    `│ Stok tersedia: <b>${product.stock}</b>\n` +
    `│ Deskripsi: ${esc(product.description || '-')}\n` +
    '╰────────────────────';

  return editOrSend(tenant, query, text, inlineKeyboard([
    [
      { text: '📥 Add Stock', callback_data: `admin:addstock:${product.id}` },
      { text: '💸 Edit Harga', callback_data: `admin:editprice:${product.id}` }
    ],
    [{ text: product.is_active ? '⚫ Nonaktifkan Produk' : '🟢 Aktifkan Produk', callback_data: `admin:toggle:${product.id}` }],
    [{ text: '🔙 Kelola Produk', callback_data: 'admin:products' }],
    [{ text: '👑 Admin Panel', callback_data: 'admin' }]
  ]));
}

async function startAddProduct(tenant, query) {
  if (!ownerOnly(tenant, query.from)) return;
  await setSession(tenant, query.from.id, 'ADMIN_ADD_PRODUCT', {});

  const text =
    '➕ <b>ADD PRODUCT</b>\n\n' +
    'Kirim data produk dengan format:\n' +
    '<code>KODE | NAMA PRODUK | HARGA | DESKRIPSI</code>\n\n' +
    'Contoh:\n' +
    '<code>YT1 | YouTube Premium 1 Bulan | 15000 | Garansi 7 hari</code>\n\n' +
    'Produk akan dibuat dengan stok kosong. Setelah itu gunakan <b>Add Stock</b>.\n' +
    'Ketik <code>/cancel</code> untuk batal.';

  return editOrSend(tenant, query, text, adminBackKeyboard());
}

async function handleAdminAddProductText(tenant, from, chatId, text) {
  const parts = parsePipeLine(text, 3);
  if (!parts) {
    return sendMessage(tenant.bot_token, chatId, '❌ Format salah. Gunakan:\n<code>KODE | NAMA PRODUK | HARGA | DESKRIPSI</code>');
  }

  const [codeRaw, name, priceRaw, description = ''] = parts;
  const code = codeRaw.replace(/\s+/g, '').toUpperCase();
  const price = parseNominal(priceRaw);

  if (!code || !price) {
    return sendMessage(tenant.bot_token, chatId, '❌ Kode/harga tidak valid. Contoh harga: <code>15000</code>.');
  }

  const { data: product, error } = await supabaseAdmin()
    .from('products')
    .insert({ tenant_id: tenant.id, code, name, price, description, is_active: true })
    .select('*')
    .single();

  if (error) {
    if (String(error.message || '').includes('duplicate') || error.code === '23505') {
      return sendMessage(tenant.bot_token, chatId, `❌ Kode produk <code>${esc(code)}</code> sudah ada. Pakai kode lain atau edit produk lama.`, { reply_markup: adminBackKeyboard() });
    }
    throw error;
  }

  await clearSession(tenant, from.id);

  return sendMessage(
    tenant.bot_token,
    chatId,
    `✅ <b>Produk berhasil dibuat!</b>\n\nKode: <code>${esc(product.code)}</code>\nNama: <b>${esc(product.name)}</b>\nHarga: <b>${formatRupiah(product.price)}</b>\nStok: <b>0</b>\n\nLanjut tambahkan stock akun untuk produk ini.`,
    { reply_markup: inlineKeyboard([[{ text: '📥 Add Stock Sekarang', callback_data: `admin:addstock:${product.id}` }], [{ text: '🧰 Kelola Produk', callback_data: 'admin:products' }]]) }
  );
}

async function startAddStockProductList(tenant, query) {
  if (!ownerOnly(tenant, query.from)) return;

  const { data: products, error } = await supabaseAdmin()
    .from('product_stock')
    .select('id,code,name,stock,is_active')
    .eq('tenant_id', tenant.id)
    .order('code', { ascending: true });

  if (error) throw error;

  if (!products?.length) {
    return editOrSend(tenant, query, '📥 <b>Add Stock</b>\n\nBelum ada produk. Buat produk dulu ya.', inlineKeyboard([[{ text: '➕ Add Product', callback_data: 'admin:addproduct' }], [{ text: '👑 Admin Panel', callback_data: 'admin' }]]));
  }

  const rows = products.map((p) => [{ text: `${p.is_active ? '🟢' : '⚫'} ${p.code}. ${p.name} • stok ${p.stock}`.slice(0, 60), callback_data: `admin:addstock:${p.id}` }]);
  rows.push([{ text: '👑 Admin Panel', callback_data: 'admin' }]);

  return editOrSend(tenant, query, '📥 <b>Pilih produk yang ingin ditambah stoknya:</b>', inlineKeyboard(rows));
}

async function startAddStockForProduct(tenant, query, productId) {
  if (!ownerOnly(tenant, query.from)) return;

  const { data: product, error } = await supabaseAdmin()
    .from('products')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('id', productId)
    .maybeSingle();

  if (error) throw error;
  if (!product) return editOrSend(tenant, query, '❌ Produk tidak ditemukan.', adminBackKeyboard());

  await setSession(tenant, query.from.id, 'ADMIN_ADD_STOCK', { productId });

  const text =
    `📥 <b>ADD STOCK</b>\nProduk: <b>${esc(product.name)}</b>\nKode: <code>${esc(product.code)}</code>\n\n` +
    'Kirim akun dengan format per baris:\n' +
    '<code>username | password | tipe | catatan</code>\n\n' +
    'Bisa langsung banyak baris, contoh:\n' +
    '<code>akun1@mail.com | pass123 | 1 Bulan | Garansi 7 hari\nakun2@mail.com | pass456 | 1 Bulan | Garansi 7 hari</code>\n\n' +
    'Kolom <b>tipe</b> dan <b>catatan</b> boleh dikosongkan. Ketik <code>/cancel</code> untuk batal.';

  return editOrSend(tenant, query, text, inlineKeyboard([[{ text: '🔙 Detail Produk', callback_data: `admin:product:${product.id}` }], [{ text: '👑 Admin Panel', callback_data: 'admin' }]]));
}

async function handleAdminAddStockText(tenant, from, chatId, text, session) {
  const productId = session?.data?.productId;
  if (!productId) return sendMessage(tenant.bot_token, chatId, '❌ Data produk hilang. Ulangi dari Admin Panel.', { reply_markup: adminBackKeyboard() });

  const lines = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const accounts = [];
  const rejected = [];

  for (const line of lines) {
    const parts = parsePipeLine(line, 2);
    if (!parts) {
      rejected.push(line);
      continue;
    }
    const [username, password, tipe = '', extra = ''] = parts;
    accounts.push({ tenant_id: tenant.id, product_id: productId, username, password, tipe, extra, status: 'available' });
  }

  if (!accounts.length) {
    return sendMessage(tenant.bot_token, chatId, '❌ Tidak ada akun valid. Format minimal:\n<code>username | password</code>');
  }

  const { error } = await supabaseAdmin().from('product_accounts').insert(accounts);
  if (error) throw error;

  await clearSession(tenant, from.id);

  const { data: product } = await supabaseAdmin().from('product_stock').select('*').eq('tenant_id', tenant.id).eq('id', productId).maybeSingle();
  const textResult =
    `✅ <b>Stock berhasil ditambahkan!</b>\n\n` +
    `Produk: <b>${esc(product?.name || '-')}</b>\n` +
    `Masuk: <b>${accounts.length}</b> akun\n` +
    `Stok sekarang: <b>${product?.stock ?? '-'}</b>\n` +
    (rejected.length ? `\n⚠️ Baris gagal dibaca: <b>${rejected.length}</b>` : '');

  return sendMessage(tenant.bot_token, chatId, textResult, { reply_markup: inlineKeyboard([[{ text: '📥 Tambah Stock Lagi', callback_data: `admin:addstock:${productId}` }], [{ text: '🧰 Detail Produk', callback_data: `admin:product:${productId}` }]]) });
}

async function startEditPrice(tenant, query, productId) {
  if (!ownerOnly(tenant, query.from)) return;

  const { data: product, error } = await supabaseAdmin()
    .from('products')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('id', productId)
    .maybeSingle();

  if (error) throw error;
  if (!product) return editOrSend(tenant, query, '❌ Produk tidak ditemukan.', adminBackKeyboard());

  await setSession(tenant, query.from.id, 'ADMIN_EDIT_PRICE', { productId });
  return editOrSend(tenant, query, `💸 <b>Edit Harga</b>\n\nProduk: <b>${esc(product.name)}</b>\nHarga saat ini: <b>${formatRupiah(product.price)}</b>\n\nKetik harga baru. Contoh: <code>25000</code>\nKetik <code>/cancel</code> untuk batal.`, inlineKeyboard([[{ text: '🔙 Detail Produk', callback_data: `admin:product:${product.id}` }]]));
}

async function handleAdminEditPriceText(tenant, from, chatId, text, session) {
  const productId = session?.data?.productId;
  const price = parseNominal(text);
  if (!productId || !price) return sendMessage(tenant.bot_token, chatId, '❌ Harga tidak valid. Contoh: <code>25000</code>.');

  const { data: product, error } = await supabaseAdmin()
    .from('products')
    .update({ price, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenant.id)
    .eq('id', productId)
    .select('*')
    .single();

  if (error) throw error;
  await clearSession(tenant, from.id);

  return sendMessage(tenant.bot_token, chatId, `✅ Harga <b>${esc(product.name)}</b> berhasil diubah menjadi <b>${formatRupiah(product.price)}</b>.`, { reply_markup: inlineKeyboard([[{ text: '🧰 Detail Produk', callback_data: `admin:product:${product.id}` }], [{ text: '👑 Admin Panel', callback_data: 'admin' }]]) });
}

async function toggleProduct(tenant, query, productId) {
  if (!ownerOnly(tenant, query.from)) return;

  const db = supabaseAdmin();
  const { data: product, error } = await db.from('products').select('*').eq('tenant_id', tenant.id).eq('id', productId).maybeSingle();
  if (error) throw error;
  if (!product) return editOrSend(tenant, query, '❌ Produk tidak ditemukan.', adminBackKeyboard());

  const { data: updated, error: updateError } = await db
    .from('products')
    .update({ is_active: !product.is_active, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenant.id)
    .eq('id', product.id)
    .select('*')
    .single();

  if (updateError) throw updateError;
  await answerCallbackQuery(tenant.bot_token, query.id, updated.is_active ? 'Produk diaktifkan 🟢' : 'Produk dinonaktifkan ⚫', { show_alert: true }).catch(() => {});
  return adminProductMenu(tenant, query, productId);
}

async function startBroadcast(tenant, query) {
  if (!ownerOnly(tenant, query.from)) return;
  await setSession(tenant, query.from.id, 'ADMIN_BROADCAST', {});

  const text =
    '📢 <b>BROADCAST MESSAGE</b>\n\n' +
    'Kirim teks yang ingin dikirim ke semua user bot ini.\n\n' +
    'Contoh:\n' +
    '<code>🔥 Promo malam ini! Semua produk diskon 10% sampai jam 23:59.</code>\n\n' +
    'Untuk keamanan, broadcast saat ini mendukung teks saja. Ketik <code>/cancel</code> untuk batal.';

  return editOrSend(tenant, query, text, adminBackKeyboard());
}

async function handleAdminBroadcastText(tenant, from, chatId, text) {
  if (!String(text || '').trim()) return sendMessage(tenant.bot_token, chatId, '❌ Broadcast kosong. Kirim teks broadcast.');

  const { data: users, error } = await supabaseAdmin()
    .from('customers')
    .select('telegram_user_id')
    .eq('tenant_id', tenant.id);

  if (error) throw error;
  if (!users?.length) return sendMessage(tenant.bot_token, chatId, '👥 Belum ada user untuk broadcast.', { reply_markup: adminBackKeyboard() });

  await sendMessage(tenant.bot_token, chatId, `🚀 Broadcast dimulai ke <b>${users.length}</b> user...`);

  let success = 0;
  let failed = 0;
  const safeText =
    `📢 <b>Broadcast ${esc(tenant.store_name || 'Store')}</b>\n\n` +
    `${esc(text)}\n\n` +
    '— dikirim oleh owner';

  for (const user of users) {
    try {
      await sendMessage(tenant.bot_token, user.telegram_user_id, safeText, { reply_markup: inlineKeyboard([[{ text: '🛍️ Buka Menu', callback_data: 'menu' }]]) });
      success += 1;
    } catch {
      failed += 1;
    }
  }

  await clearSession(tenant, from.id);
  return sendMessage(tenant.bot_token, chatId, `✅ <b>Broadcast selesai!</b>\n\nBerhasil: <b>${success}</b>\nGagal: <b>${failed}</b>`, { reply_markup: adminBackKeyboard() });
}

async function adminUsersPanel(tenant, query) {
  if (!ownerOnly(tenant, query.from)) return;

  const db = supabaseAdmin();
  const { data: users, error } = await db
    .from('customers')
    .select('id,telegram_user_id,username,full_name,created_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  const ids = (users || []).map((u) => u.id);
  const { data: balances } = ids.length
    ? await db.from('balances').select('customer_id,amount').in('customer_id', ids)
    : { data: [] };

  const balanceMap = new Map((balances || []).map((b) => [b.customer_id, Number(b.amount || 0)]));
  const text =
    '👥 <b>DATA USER TERBARU</b>\n\n' +
    (users?.length
      ? users.map((u) => `👤 <b>${esc(u.full_name || '-')}</b> ${u.username ? `(@${esc(u.username)})` : ''}\nID: <code>${u.telegram_user_id}</code> • Saldo: <b>${formatRupiah(balanceMap.get(u.id) || 0)}</b>`).join('\n\n')
      : 'Belum ada user.') +
    '\n\nGunakan <b>Atur Saldo</b> untuk tambah/kurangi saldo manual.';

  return editOrSend(tenant, query, text, inlineKeyboard([[{ text: '💵 Atur Saldo', callback_data: 'admin:balance' }], [{ text: '👑 Admin Panel', callback_data: 'admin' }]]));
}

async function startAdjustBalance(tenant, query) {
  if (!ownerOnly(tenant, query.from)) return;
  await setSession(tenant, query.from.id, 'ADMIN_ADJUST_BALANCE', {});

  const text =
    '💵 <b>ATUR SALDO USER</b>\n\n' +
    'Kirim dengan format:\n' +
    '<code>TELEGRAM_ID | NOMINAL | CATATAN</code>\n\n' +
    'Contoh tambah saldo:\n<code>123456789 | 10000 | bonus</code>\n\n' +
    'Contoh kurangi saldo:\n<code>123456789 | -5000 | koreksi saldo</code>\n\n' +
    'Ketik <code>/cancel</code> untuk batal.';

  return editOrSend(tenant, query, text, adminBackKeyboard());
}

async function handleAdminAdjustBalanceText(tenant, from, chatId, text) {
  const parts = parsePipeLine(text, 2);
  if (!parts) return sendMessage(tenant.bot_token, chatId, '❌ Format salah. Gunakan:\n<code>TELEGRAM_ID | NOMINAL | CATATAN</code>');

  const telegramId = Number(String(parts[0]).replace(/[^0-9]/g, ''));
  const nominal = Number(String(parts[1]).replace(/[^0-9-]/g, ''));
  const note = parts[2] || 'Adjustment owner';

  if (!telegramId || !Number.isFinite(nominal) || nominal === 0) {
    return sendMessage(tenant.bot_token, chatId, '❌ Telegram ID/nominal tidak valid. Nominal boleh positif atau negatif.');
  }

  const db = supabaseAdmin();
  const { data: customer, error } = await db
    .from('customers')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('telegram_user_id', telegramId)
    .maybeSingle();

  if (error) throw error;
  if (!customer) return sendMessage(tenant.bot_token, chatId, '❌ User belum pernah /start bot ini, jadi belum ada di database.');

  const { data: bal } = await db.from('balances').select('*').eq('customer_id', customer.id).maybeSingle();
  const current = Number(bal?.amount || 0);
  const next = Math.max(0, current + nominal);

  const { error: balanceError } = await db
    .from('balances')
    .upsert({ tenant_id: tenant.id, customer_id: customer.id, amount: next, updated_at: new Date().toISOString() }, { onConflict: 'customer_id' });

  if (balanceError) throw balanceError;

  const { error: trxError } = await db.from('transactions').insert({
    tenant_id: tenant.id,
    customer_id: customer.id,
    type: 'ADJUSTMENT',
    amount: nominal,
    description: note,
    meta: { by: from.id, before: current, after: next }
  });

  if (trxError) throw trxError;

  await clearSession(tenant, from.id);

  await sendMessage(
    tenant.bot_token,
    customer.telegram_user_id,
    `💵 <b>Saldo kamu diperbarui oleh owner.</b>\nPerubahan: <b>${formatRupiah(nominal)}</b>\nSaldo sekarang: <b>${formatRupiah(next)}</b>`
  ).catch(() => {});

  return sendMessage(tenant.bot_token, chatId, `✅ Saldo user <code>${telegramId}</code> berhasil diperbarui.\nSebelum: <b>${formatRupiah(current)}</b>\nSesudah: <b>${formatRupiah(next)}</b>`, { reply_markup: adminBackKeyboard() });
}

async function adminPendingInvoices(tenant, query) {
  if (!ownerOnly(tenant, query.from)) return;

  const { data: invoices, error } = await supabaseAdmin()
    .from('payment_invoices')
    .select('order_id,amount,total_payment,status,created_at,customers(telegram_user_id,username,full_name)')
    .eq('tenant_id', tenant.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  const text =
    '🧾 <b>PENDING INVOICE</b>\n\n' +
    (invoices?.length
      ? invoices.map((inv) => {
          const user = inv.customers || {};
          return `⏳ <code>${esc(inv.order_id)}</code>\n👤 ${esc(user.full_name || user.username || user.telegram_user_id || '-')}\nSaldo: <b>${formatRupiah(inv.amount)}</b> • Bayar: <b>${formatRupiah(inv.total_payment)}</b>`;
        }).join('\n\n')
      : 'Tidak ada invoice pending.');

  return editOrSend(tenant, query, text, adminBackKeyboard());
}

async function handleAdminTextSession(tenant, from, chatId, text, session) {
  if (session.state === 'ADMIN_ADD_PRODUCT') return handleAdminAddProductText(tenant, from, chatId, text);
  if (session.state === 'ADMIN_ADD_STOCK') return handleAdminAddStockText(tenant, from, chatId, text, session);
  if (session.state === 'ADMIN_EDIT_PRICE') return handleAdminEditPriceText(tenant, from, chatId, text, session);
  if (session.state === 'ADMIN_BROADCAST') return handleAdminBroadcastText(tenant, from, chatId, text);
  if (session.state === 'ADMIN_ADJUST_BALANCE') return handleAdminAdjustBalanceText(tenant, from, chatId, text);
  return null;
}

async function handleMessage(tenant, update) {
  const message = update.message;
  const from = message.from;
  const chatId = message.chat.id;
  const customer = await ensureCustomer(tenant, from);
  const text = String(message.text || '').trim();

  if (text.startsWith('/start')) {
    await clearSession(tenant, from.id);
    return sendMenu(tenant, chatId, from, customer);
  }

  const session = await getSession(tenant, from.id);

  if (text.startsWith('/cancel')) {
    await clearSession(tenant, from.id);
    await sendMessage(tenant.bot_token, chatId, '✅ Aksi dibatalkan.');
    return ownerOnly(tenant, from) ? sendMessage(tenant.bot_token, chatId, '👑 Kembali ke Admin Panel.', { reply_markup: adminKeyboard() }) : sendMenu(tenant, chatId, from, customer);
  }

  if (ownerOnly(tenant, from) && session?.state?.startsWith('ADMIN_')) {
    return handleAdminTextSession(tenant, from, chatId, text, session);
  }

  if (session?.state === 'AWAITING_DEPOSIT_CUSTOM') {
    const amount = parseNominal(text);
    if (!amount) {
      return sendMessage(tenant.bot_token, chatId, '❌ Nominal tidak valid. Ketik angka saja, contoh: <code>25000</code>.');
    }

    await clearSession(tenant, from.id);
    await sendMessage(tenant.bot_token, chatId, `⏳ Membuat invoice QRIS ${formatRupiah(amount)}...`);
    return createDeposit(tenant, customer, chatId, amount);
  }

  // Shortcut: user mengetik kode produk, misalnya "1".
  if (/^\w{1,12}$/.test(text)) {
    const { data: product } = await supabaseAdmin()
      .from('products')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('code', text)
      .maybeSingle();

    if (product) {
      return showProduct(tenant, { from, message: { chat: { id: chatId }, message_id: message.message_id } }, product.id);
    }
  }

  return sendMenu(tenant, chatId, from, customer);
}

async function handleCallback(tenant, update) {
  const query = update.callback_query;
  const data = query.data || '';
  const customer = await ensureCustomer(tenant, query.from);

  // Selalu coba jawab callback supaya loading Telegram hilang.
  try {
    if (!['paycheck'].some((prefix) => data.startsWith(prefix))) {
      await answerCallbackQuery(tenant.bot_token, query.id);
    }
  } catch {}

  if (data === 'noop') return;
  if (data === 'menu') {
    await clearSession(tenant, query.from.id);
    return sendMenu(tenant, query.from.id, query.from, customer);
  }
  if (data === 'products') return listProducts(tenant, query);
  if (data === 'stock') return stockInfo(tenant, query);
  if (data === 'deposit') return showDeposit(tenant, query);
  if (data === 'history') return history(tenant, query, customer);
  if (data === 'info') return infoBot(tenant, query);
  if (data === 'admin') return adminPanel(tenant, query);
  if (data === 'admin:addproduct') return startAddProduct(tenant, query);
  if (data === 'admin:addstock') return startAddStockProductList(tenant, query);
  if (data === 'admin:products') return adminProductList(tenant, query);
  if (data === 'admin:broadcast') return startBroadcast(tenant, query);
  if (data === 'admin:users') return adminUsersPanel(tenant, query);
  if (data === 'admin:balance') return startAdjustBalance(tenant, query);
  if (data === 'admin:pending') return adminPendingInvoices(tenant, query);

  if (data.startsWith('admin:product:')) {
    return adminProductMenu(tenant, query, data.split(':')[2]);
  }

  if (data.startsWith('admin:addstock:')) {
    return startAddStockForProduct(tenant, query, data.split(':')[2]);
  }

  if (data.startsWith('admin:editprice:')) {
    return startEditPrice(tenant, query, data.split(':')[2]);
  }

  if (data.startsWith('admin:toggle:')) {
    return toggleProduct(tenant, query, data.split(':')[2]);
  }

  if (data.startsWith('product:')) {
    return showProduct(tenant, query, data.split(':')[1]);
  }

  if (data.startsWith('qty:')) {
    return updateQty(tenant, query, data.split(':')[1]);
  }

  if (data === 'buy:confirm') {
    return confirmOrder(tenant, query);
  }

  if (data.startsWith('deposit:')) {
    return handleDepositAmount(tenant, query, data.split(':')[1], customer);
  }

  if (data.startsWith('paycheck:')) {
    return checkPayment(tenant, query, data.split(':')[1]);
  }

  if (data.startsWith('paycancel:')) {
    return cancelPayment(tenant, query, data.split(':')[1]);
  }

  return editOrSend(tenant, query, '❌ Aksi tidak dikenali.', inlineKeyboard([[{ text: '🏠 Menu Utama', callback_data: 'menu' }]]));
}

export async function handleTelegramUpdate(tenant, update) {
  if (update.message) return handleMessage(tenant, update);
  if (update.callback_query) return handleCallback(tenant, update);
  return null;
}
