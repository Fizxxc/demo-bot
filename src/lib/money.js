export function formatRupiah(value = 0) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function parseNominal(text) {
  const clean = String(text || '').replace(/[^0-9]/g, '');
  const amount = Number(clean);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.floor(amount);
}
