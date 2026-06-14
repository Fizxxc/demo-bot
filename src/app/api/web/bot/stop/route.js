import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan, terminalLog } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { deleteWebhook } from '../../../../../lib/telegram.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  try {
    if (!user.tenant_id) throw new Error('Bot belum disimpan.');
    const db = supabaseAdmin();
    const { data: tenant } = await db.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle();
    if (!tenant) throw new Error('Tenant bot tidak ditemukan.');
    await deleteWebhook(tenant.bot_token);
    await db.from('tenants').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', tenant.id);
    await terminalLog({ userId: user.id, tenantId: tenant.id, type: 'bot_stopped', severity: 'warning', message: `Webhook @${tenant.bot_username} dimatikan.` });
  } catch (error) {
    await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'bot_stop_error', severity: 'error', message: error.message });
  }
  return NextResponse.redirect(new URL('/app/terminal', req.url));
}
