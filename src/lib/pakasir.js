import { pakasirFallbackConfig } from './config.js';

const BASE_URL = 'https://app.pakasir.com';

export function getPakasirConfig(tenant) {
  const fallback = pakasirFallbackConfig();
  return {
    project: tenant.pakasir_project_slug || fallback.project,
    apiKey: tenant.pakasir_api_key || fallback.apiKey
  };
}

function ensureConfig(config) {
  if (!config.project || !config.apiKey) {
    const err = new Error('Credential Pakasir belum diatur untuk tenant ini. Isi PAKASIR_PROJECT_SLUG dan PAKASIR_API_KEY atau kolom tenant.');
    err.status = 400;
    throw err;
  }
}

async function pakasirPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data?.message || `Pakasir request gagal: ${path}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

export async function createQrisTransaction(tenant, { orderId, amount }) {
  const config = getPakasirConfig(tenant);
  ensureConfig(config);

  const data = await pakasirPost('/api/transactioncreate/qris', {
    project: config.project,
    order_id: orderId,
    amount,
    api_key: config.apiKey
  });

  return data.payment;
}

export async function getTransactionDetail(tenant, { orderId, amount }) {
  const config = getPakasirConfig(tenant);
  ensureConfig(config);

  const params = new URLSearchParams({
    project: config.project,
    amount: String(amount),
    order_id: orderId,
    api_key: config.apiKey
  });

  const res = await fetch(`${BASE_URL}/api/transactiondetail?${params.toString()}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data?.message || 'Gagal mengecek status transaksi Pakasir');
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data.transaction;
}

export async function cancelTransaction(tenant, { orderId, amount }) {
  const config = getPakasirConfig(tenant);
  ensureConfig(config);

  return pakasirPost('/api/transactioncancel', {
    project: config.project,
    order_id: orderId,
    amount,
    api_key: config.apiKey
  });
}
