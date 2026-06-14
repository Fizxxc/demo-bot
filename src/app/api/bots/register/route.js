import crypto from 'node:crypto';
import { z } from 'zod';
import { assertDashboardAuth, handleRouteError, json, readJson } from '../../../../lib/http.js';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';
import { getMe } from '../../../../lib/telegram.js';

export const runtime = 'nodejs';

const schema = z.object({
  botToken: z.string().min(20),
  ownerTelegramId: z.coerce.number().int().positive(),
  storeName: z.string().min(2).default('Kograph Market'),
  pakasirProjectSlug: z.string().optional().nullable(),
  pakasirApiKey: z.string().optional().nullable()
});

export async function POST(req) {
  try {
    assertDashboardAuth(req);
    const body = schema.parse(await readJson(req));
    const me = await getMe(body.botToken);

    const { data, error } = await supabaseAdmin()
      .from('tenants')
      .insert({
        owner_telegram_id: body.ownerTelegramId,
        bot_token: body.botToken,
        bot_username: me.username,
        store_name: body.storeName,
        webhook_secret: crypto.randomBytes(24).toString('hex'),
        pakasir_project_slug: body.pakasirProjectSlug || null,
        pakasir_api_key: body.pakasirApiKey || null
      })
      .select('id,owner_telegram_id,bot_username,store_name,is_active,created_at')
      .single();

    if (error) throw error;

    return json({ ok: true, tenant: data });
  } catch (error) {
    return handleRouteError(error);
  }
}
