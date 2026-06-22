import { requireUser } from '../../../../../../lib/auth.js';
import { supabaseAdmin } from '../../../../../../lib/supabaseAdmin.js';
import { generateQrisImage } from '../../../../../../lib/qrisImage.js';
import { extractQrImageUrl, extractQrString } from '../../../../../../lib/paymentNormalize.js';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const user = await requireUser();
  const { id } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const table = type === 'merchant_deposit' ? 'merchant_deposits' : 'plan_purchases';
  const { data: invoice } = await supabaseAdmin().from(table).select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!invoice) return new Response('not found', { status: 404 });
  const qrPayload = invoice.payment_number || extractQrString(invoice.raw) || extractQrImageUrl(invoice.raw);
  const png = await generateQrisImage(qrPayload);
  return new Response(png, { headers: { 'content-type': 'image/png', 'cache-control': 'no-store' } });
}
