import { z } from 'zod';
import { assertDashboardAuth, handleRouteError, json, readJson } from '../../../../lib/http.js';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';
import { deleteWebhook } from '../../../../lib/telegram.js';

export const runtime = 'nodejs';

const schema = z.object({ tenantId: z.string().uuid() });

export async function POST(req) {
  try {
    assertDashboardAuth(req);
    const { tenantId } = schema.parse(await readJson(req));

    const db = supabaseAdmin();
    const { data: tenant, error } = await db.from('tenants').select('*').eq('id', tenantId).maybeSingle();
    if (error) throw error;
    if (!tenant) return json({ ok: false, error: 'Tenant tidak ditemukan' }, 404);

    await deleteWebhook(tenant.bot_token);

    const { error: updateError } = await db
      .from('tenants')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', tenant.id);

    if (updateError) throw updateError;

    return json({ ok: true, status: 'stopped', botUsername: tenant.bot_username });
  } catch (error) {
    return handleRouteError(error);
  }
}
