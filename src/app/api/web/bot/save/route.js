import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan, terminalLog } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { getMe } from '../../../../../lib/telegram.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  const form = await req.formData();
  const botToken = String(form.get('botToken') || '').trim();
  const ownerTelegramId = Number(String(form.get('ownerTelegramId') || '').replace(/[^0-9]/g, ''));
  const storeName = String(form.get('storeName') || 'Store').trim();
  const pakasirProjectSlug = String(form.get('pakasirProjectSlug') || '').trim() || null;
  const pakasirApiKey = String(form.get('pakasirApiKey') || '').trim() || null;

  try {
    const me = await getMe(botToken);
    const db = supabaseAdmin();
    let tenantId = user.tenant_id;
    if (!tenantId) {
      const { data: tenant, error } = await db.from('tenants').insert({
        owner_telegram_id: ownerTelegramId,
        bot_token: botToken,
        bot_username: me.username,
        store_name: storeName,
        webhook_secret: crypto.randomBytes(24).toString('hex'),
        pakasir_project_slug: pakasirProjectSlug,
        pakasir_api_key: pakasirApiKey
      }).select('*').single();
      if (error) throw error;
      tenantId = tenant.id;
      await db.from('web_users').update({ tenant_id: tenantId }).eq('id', user.id);
    } else {
      const { error } = await db.from('tenants').update({
        owner_telegram_id: ownerTelegramId,
        bot_token: botToken,
        bot_username: me.username,
        store_name: storeName,
        pakasir_project_slug: pakasirProjectSlug,
        pakasir_api_key: pakasirApiKey,
        updated_at: new Date().toISOString()
      }).eq('id', tenantId);
      if (error) throw error;
    }
    await terminalLog({ userId: user.id, tenantId, type: 'bot_saved', severity: 'success', message: `Bot @${me.username} tersimpan.` });
    return NextResponse.redirect(new URL('/app/bot', req.url));
  } catch (error) {
    await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'bot_save_error', severity: 'error', message: error.message });
    return NextResponse.redirect(new URL('/app/bot?error=save_failed', req.url));
  }
}
