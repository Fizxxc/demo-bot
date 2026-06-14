import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan, terminalLog } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { deleteWebhook } from '../../../../../lib/telegram.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  const db = supabaseAdmin();
  try {
    await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'command', severity: 'info', message: 'Command diterima: stop bot.' });
    if (!user.tenant_id) throw new Error('Bot belum disimpan.');

    await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'bot_stop_step', severity: 'warning', message: 'Mengambil data tenant untuk mematikan webhook...' });
    const { data: tenant, error: tenantError } = await db.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle();
    if (tenantError) throw tenantError;
    if (!tenant) throw new Error('Tenant bot tidak ditemukan.');

    await deleteWebhook(tenant.bot_token);
    await terminalLog({ userId: user.id, tenantId: tenant.id, type: 'bot_stop_step', severity: 'warning', message: 'Webhook Telegram berhasil dihapus. Menyimpan status offline...' });

    const { error: updateError } = await db.from('tenants').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', tenant.id);
    if (updateError) throw updateError;

    await terminalLog({ userId: user.id, tenantId: tenant.id, type: 'bot_stopped', severity: 'warning', message: `Bot @${tenant.bot_username || 'telegram'} sudah dimatikan.` });
    return NextResponse.redirect(new URL('/app/terminal?success=bot_stopped', req.url));
  } catch (error) {
    await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'bot_stop_error', severity: 'error', message: `Stop gagal: ${error.message}` });
    return NextResponse.redirect(new URL(`/app/terminal?error=${encodeURIComponent(error.message)}`, req.url));
  }
}
