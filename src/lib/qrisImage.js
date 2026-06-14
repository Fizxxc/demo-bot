import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, '../../public/assets/qris-template.png');

// Posisi presisi sesuai template user:
// layer QR = 1 inch, X = 0.75 inch, Y = 1.03 inch.
// Pada template 2048x2048 ini 1 inch = 818 px, sehingga:
export const QR_PLACEMENT = {
  left: 617,
  top: 843,
  size: 818
};

export async function generateQrisImage(qrString) {
  if (!qrString) throw new Error('QR string Pakasir kosong');

  const qrBuffer = await QRCode.toBuffer(qrString, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    scale: 16,
    width: QR_PLACEMENT.size,
    color: { dark: '#000000', light: '#FFFFFF' }
  });

  return sharp(TEMPLATE_PATH)
    .composite([
      {
        input: qrBuffer,
        left: QR_PLACEMENT.left,
        top: QR_PLACEMENT.top
      }
    ])
    .png()
    .toBuffer();
}
