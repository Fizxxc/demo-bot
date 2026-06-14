import { handleTelegramUpdate } from '../../../../bot/handlers.js';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  try {
    const { tenantId } = await params;
    const { data: tenant, error } = await supabaseAdmin()
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .maybeSingle();

    if (error) throw error;
    if (!tenant) return Response.json({ ok: false, error: 'tenant_not_found' }, { status: 404 });

    const secret = req.headers.get('x-telegram-bot-api-secret-token');
    if (tenant.webhook_secret && secret !== tenant.webhook_secret) {
      return Response.json({ ok: false, error: 'invalid_secret' }, { status: 401 });
    }

    const update = await req.json();
    await handleTelegramUpdate(tenant, update);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    // Telegram akan retry kalau status non-2xx. Tetap balas 200 agar tidak terjadi retry loop.
    return Response.json({ ok: false, error: error.message }, { status: 200 });
  }
}

export async function GET() {
  return Response.json({ ok: true, message: 'Telegram webhook endpoint aktif.' });
}
