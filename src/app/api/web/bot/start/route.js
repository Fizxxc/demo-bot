import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan, terminalLog } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { appUrl } from '../../../../../lib/config.js';
import { setWebhook } from '../../../../../lib/telegram.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  try {
    if (!user.tenant_id) throw new Error('Bot belum disimpan.');
    const db = supabaseAdmin();
    const { data: tenant } = await db.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle();
    if (!tenant) throw new Error('Tenant bot tidak ditemukan.');
    await setWebhook(tenant.bot_token, { url: `${appUrl()}/api/telegram/${tenant.id}`, secretToken: tenant.webhook_secret });
    await db.from('tenants').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', tenant.id);
    await terminalLog({ userId: user.id, tenantId: tenant.id, type: 'bot_started', severity: 'success', message: `Webhook @${tenant.bot_username} aktif.` });
  } catch (error) {
    await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'bot_start_error', severity: 'error', message: error.message });
  }
  return NextResponse.redirect(new URL('/app/terminal', req.url));
}
