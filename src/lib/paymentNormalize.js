function readPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

const QR_STRING_PATHS = [
  'payment_number',
  'qr_string',
  'qr_content',
  'qrCode',
  'qr_code',
  'qris',
  'qris_string',
  'raw_qr',
  'payment.payment_number',
  'payment.qr_string',
  'payment.qr_content',
  'payment.qrCode',
  'payment.qr_code',
  'payment.qris',
  'payment.qris_string',
  'data.payment_number',
  'data.qr_string',
  'data.qr_content',
  'data.qris',
  'transaction.payment_number',
  'transaction.qr_string',
  'transaction.qris'
];

const QR_IMAGE_PATHS = [
  'qr_image',
  'qr_image_url',
  'qris_image',
  'qris_url',
  'payment.qr_image',
  'payment.qr_image_url',
  'payment.qris_image',
  'payment.qris_url',
  'data.qr_image',
  'data.qr_image_url',
  'data.qris_image',
  'data.qris_url'
];

export function extractQrString(obj) {
  for (const path of QR_STRING_PATHS) {
    const value = readPath(obj, path);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function extractQrImageUrl(obj) {
  for (const path of QR_IMAGE_PATHS) {
    const value = readPath(obj, path);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function normalizePaymentResponse(data, fallbackAmount = 0) {
  const source = data?.payment || data?.data || data?.transaction || data || {};
  const paymentNumber = extractQrString(data) || extractQrString(source);
  const qrImageUrl = extractQrImageUrl(data) || extractQrImageUrl(source);
  const totalPayment = Number(source.total_payment || source.total || source.amount || data?.total_payment || fallbackAmount || 0);

  return {
    ...source,
    provider_response: data,
    payment_method: source.payment_method || source.method || 'qris',
    payment_number: paymentNumber || qrImageUrl || source.payment_number || '',
    qr_image_url: qrImageUrl || source.qr_image_url || source.qris_url || '',
    fee: Number(source.fee || data?.fee || 0),
    total_payment: totalPayment || Number(fallbackAmount || 0),
    expired_at: source.expired_at || source.expired || data?.expired_at || null
  };
}
