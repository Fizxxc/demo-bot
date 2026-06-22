import crypto from 'node:crypto';
import { pakasirFallbackConfig } from './config.js';
import { normalizePaymentResponse } from './paymentNormalize.js';

const BASE_URL = process.env.PAKASIR_BASE_URL || 'https://app.pakasir.com';

export function platformOrderId(prefix = 'WEB') {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `${prefix}${date}${rand}`;
}

export async function createPlatformQris({ orderId, amount }) {
  const config = pakasirFallbackConfig();
  if (!config.project || !config.apiKey) {
    const err = new Error('Credential Pakasir platform belum diatur. Isi PAKASIR_PROJECT_SLUG dan PAKASIR_API_KEY.');
    err.status = 400;
    throw err;
  }

  const res = await fetch(`${BASE_URL}/api/transactioncreate/qris`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      project: config.project,
      order_id: orderId,
      amount,
      api_key: config.apiKey
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || 'Gagal membuat QRIS platform');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  const payment = normalizePaymentResponse(data, amount);
  if (!payment.payment_number) {
    const err = new Error('Payload QRIS dari Pakasir kosong. Cek PAKASIR_PROJECT_SLUG, PAKASIR_API_KEY, dan mode project Pakasir.');
    err.status = 502;
    err.body = data;
    throw err;
  }
  return payment;
}

export async function getPlatformTransaction({ orderId, amount }) {
  const config = pakasirFallbackConfig();
  const params = new URLSearchParams({
    project: config.project,
    amount: String(amount),
    order_id: orderId,
    api_key: config.apiKey
  });
  const res = await fetch(`${BASE_URL}/api/transactiondetail?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Gagal cek transaksi platform');
  return data.transaction;
}
