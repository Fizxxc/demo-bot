import { redirect } from 'next/navigation';
import { supabaseAdmin } from './supabaseAdmin.js';

async function safeInsert(table, payload) {
  try {
    const { error } = await supabaseAdmin().from(table).insert(payload);
    if (error) console.warn(`${table} insert warning:`, error.message);
  } catch (err) {
    console.warn(`${table} insert failed:`, err.message);
  }
}

export async function satskoLog({ userId = null, tenantId = null, type, severity = 'info', message, metadata = {} }) {
  await safeInsert('security_events', {
    user_id: userId,
    tenant_id: tenantId,
    type,
    severity,
    message,
    metadata
  });
}

export async function terminalLog({ userId = null, tenantId = null, type, severity = 'info', message, metadata = {} }) {
  await safeInsert('terminal_logs', {
    user_id: userId,
    tenant_id: tenantId,
    type,
    severity,
    message,
    metadata
  });
}

export async function ownerNotify({ userId = null, type, title, message, metadata = {} }) {
  await safeInsert('owner_notifications', {
    user_id: userId,
    type,
    title,
    message,
    metadata
  });
}

export async function guardMerchantPlan(user) {
  if (user.role === 'owner') return user;

  const createdAt = new Date(user.created_at).getTime();
  const fiveDays = 5 * 24 * 60 * 60 * 1000;

  if (!user.plan_code) {
    const db = supabaseAdmin();
    if (Date.now() - createdAt >= fiveDays) {
      await db.from('web_users').update({ status: 'blocked', blocked_reason: 'Tidak membeli plan dalam 5 hari.' }).eq('id', user.id);
      await ownerNotify({
        userId: user.id,
        type: 'account_blocked',
        title: 'Akun merchant diblokir otomatis',
        message: `${user.email} diblokir karena tidak membeli plan dalam 5 hari.`,
        metadata: { email: user.email }
      });
      redirect('/access-denied?reason=blocked_unpaid');
    }

    await ownerNotify({
      userId: user.id,
      type: 'access_denied_no_plan',
      title: 'Akses merchant ditolak SATSKO',
      message: `${user.email} mencoba akses dashboard tanpa plan aktif.`,
      metadata: { email: user.email }
    });
    await satskoLog({ userId: user.id, type: 'no_plan_access', severity: 'warning', message: 'Akses dashboard ditolak karena belum membeli plan.' });
    redirect('/access-denied?reason=no_plan');
  }

  if (user.status !== 'active') redirect('/access-denied?reason=inactive');
  return user;
}
