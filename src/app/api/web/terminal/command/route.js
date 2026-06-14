import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan, terminalLog } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { appUrl } from '../../../../../lib/config.js';
import { setWebhook, deleteWebhook } from '../../../../../lib/telegram.js';

export const runtime = 'nodejs';

async function startBot({ user, db }) {
  if (!user.tenant_id) throw new Error('Bot belum disimpan. Isi konfigurasi bot dulu.');
  await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'terminal_command', severity: 'info', message: '$ start' });
  const { data: tenant, error } = await db.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle();
  if (error) throw error;
  if (!tenant) throw new Error('Tenant bot tidak ditemukan.');
  const webhookUrl = `${appUrl()}/api/telegram/${tenant.id}`;
  await terminalLog({ userId: user.id, tenantId: tenant.id, type: 'start_prepare', severity: 'info', message: 'Validasi token, tenant, dan webhook secret selesai.' });
  await terminalLog({ userId: user.id, tenantId: tenant.id, type: 'start_set_webhook', severity: 'info', message: `Mengirim setWebhook ke Telegram: ${webhookUrl}` });
  await setWebhook(tenant.bot_token, { url: webhookUrl, secretToken: tenant.webhook_secret });
  await db.from('tenants').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', tenant.id);
  await terminalLog({ userId: user.id, tenantId: tenant.id, type: 'start_done', severity: 'success', message: `Bot @${tenant.bot_username || 'telegram'} ONLINE.` });
}

async function stopBot({ user, db }) {
  if (!user.tenant_id) throw new Error('Bot belum disimpan.');
  await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'terminal_command', severity: 'warning', message: '$ stop' });
  const { data: tenant, error } = await db.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle();
  if (error) throw error;
  if (!tenant) throw new Error('Tenant bot tidak ditemukan.');
  await terminalLog({ userId: user.id, tenantId: tenant.id, type: 'stop_prepare', severity: 'warning', message: 'Menghapus webhook Telegram...' });
  await deleteWebhook(tenant.bot_token);
  await db.from('tenants').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', tenant.id);
  await terminalLog({ userId: user.id, tenantId: tenant.id, type: 'stop_done', severity: 'warning', message: `Bot @${tenant.bot_username || 'telegram'} OFFLINE.` });
}

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  const form = await req.formData();
  const command = String(form.get('command') || '').trim().toLowerCase();
  const db = supabaseAdmin();

  try {
    if (!command) throw new Error('Command kosong.');
    if (command === 'start') await startBot({ user, db });
    else if (command === 'stop') await stopBot({ user, db });
    else if (command === 'status') {
      const { data: tenant } = user.tenant_id ? await db.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle() : { data: null };
      await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'terminal_command', severity: 'info', message: `$ status -> ${tenant?.is_active ? 'ONLINE' : 'OFFLINE'}${tenant?.bot_username ? ` (@${tenant.bot_username})` : ''}` });
    } else if (command === 'clear') {
      await db.from('terminal_logs').delete().eq('user_id', user.id);
      await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'terminal_clear', severity: 'info', message: 'Terminal dibersihkan.' });
    } else {
      await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'terminal_unknown', severity: 'warning', message: `Command tidak dikenal: ${command}. Gunakan start, stop, status, atau clear.` });
    }
    return NextResponse.redirect(new URL('/app/terminal?success=command_done', req.url));
  } catch (error) {
    await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'terminal_error', severity: 'error', message: error.message });
    return NextResponse.redirect(new URL(`/app/terminal?error=${encodeURIComponent(error.message)}`, req.url));
  }
}
