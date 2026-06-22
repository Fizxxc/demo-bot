import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, '../../public/assets/qris-template.png');

export const QR_PLACEMENT = {
  left: 617,
  top: 843,
  size: 818
};

async function readRemoteImage(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Gagal mengambil QR image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function isDataImage(value) {
  return /^data:image\//i.test(String(value || ''));
}

function isImageUrl(value) {
  return /^https?:\/\//i.test(String(value || '')) && /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(String(value || ''));
}

async function qrisLayerBuffer(qrPayload) {
  if (!qrPayload) throw new Error('QRIS payload kosong dari Pakasir');

  if (isDataImage(qrPayload)) {
    const base64 = qrPayload.split(',')[1];
    if (base64) return sharp(Buffer.from(base64, 'base64')).resize(QR_PLACEMENT.size, QR_PLACEMENT.size, { fit: 'contain', background: '#FFFFFF' }).png().toBuffer();
  }

  if (isImageUrl(qrPayload)) {
    const remote = await readRemoteImage(qrPayload);
    return sharp(remote).resize(QR_PLACEMENT.size, QR_PLACEMENT.size, { fit: 'contain', background: '#FFFFFF' }).png().toBuffer();
  }

  return QRCode.toBuffer(qrPayload, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: QR_PLACEMENT.size,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
}

async function blankQrOnly(qrPayload) {
  const qrBuffer = await qrisLayerBuffer(qrPayload);
  return sharp({
    create: {
      width: 1200,
      height: 1200,
      channels: 4,
      background: '#FFFFFF'
    }
  }).composite([{ input: qrBuffer, left: 191, top: 191 }]).png().toBuffer();
}

async function errorPlaceholder(message) {
  const safe = String(message || 'QRIS belum tersedia').replace(/[<>&]/g, '');
  const svg = `<svg width="1200" height="1200" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="70" y="70" width="1060" height="1060" rx="42" fill="#F4F7FF" stroke="#DCE8FF" stroke-width="6"/>
    <text x="600" y="560" text-anchor="middle" font-family="Arial" font-size="52" font-weight="700" fill="#2C5BFF">QRIS belum tersedia</text>
    <text x="600" y="640" text-anchor="middle" font-family="Arial" font-size="30" fill="#64748B">${safe}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function generateQrisImage(qrPayload) {
  try {
    const qrBuffer = await qrisLayerBuffer(qrPayload);

    try {
      await fs.access(TEMPLATE_PATH);
      return sharp(TEMPLATE_PATH)
        .composite([{ input: qrBuffer, left: QR_PLACEMENT.left, top: QR_PLACEMENT.top }])
        .png()
        .toBuffer();
    } catch {
      return blankQrOnly(qrPayload);
    }
  } catch (error) {
    return errorPlaceholder(error.message);
  }
}
