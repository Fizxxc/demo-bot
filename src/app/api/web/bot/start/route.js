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
  const db = supabaseAdmin();
  try {
    await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'command', severity: 'info', message: 'Command diterima: start bot.' });
    if (!user.tenant_id) throw new Error('Bot belum disimpan. Isi konfigurasi bot terlebih dahulu.');

    await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'bot_start_step', severity: 'info', message: 'Mengecek tenant dan token bot...' });
    const { data: tenant, error: tenantError } = await db.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle();
    if (tenantError) throw tenantError;
    if (!tenant) throw new Error('Tenant bot tidak ditemukan.');

    const webhookUrl = `${appUrl()}/api/telegram/${tenant.id}`;
    await terminalLog({ userId: user.id, tenantId: tenant.id, type: 'bot_start_step', severity: 'info', message: `Menyiapkan webhook: ${webhookUrl}` });

    await setWebhook(tenant.bot_token, { url: webhookUrl, secretToken: tenant.webhook_secret });
    await terminalLog({ userId: user.id, tenantId: tenant.id, type: 'bot_start_step', severity: 'success', message: 'Telegram menerima setWebhook. Menyimpan status bot...' });

    const { error: updateError } = await db.from('tenants').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', tenant.id);
    if (updateError) throw updateError;

    await terminalLog({ userId: user.id, tenantId: tenant.id, type: 'bot_started', severity: 'success', message: `Bot @${tenant.bot_username || 'telegram'} aktif dan siap menerima pesan.` });
    return NextResponse.redirect(new URL('/app/terminal?success=bot_started', req.url));
  } catch (error) {
    await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'bot_start_error', severity: 'error', message: `Start gagal: ${error.message}` });
    return NextResponse.redirect(new URL(`/app/terminal?error=${encodeURIComponent(error.message)}`, req.url));
  }
}
