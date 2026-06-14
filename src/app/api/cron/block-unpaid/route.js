import { json } from '../../../../lib/http.js';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';
import { ownerNotify } from '../../../../lib/satsko.js';

export const runtime = 'nodejs';

export async function GET(req) {
  const url = new URL(req.url);
  const secret = req.headers.get('x-cron-secret') || url.searchParams.get('secret');
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET && !isVercelCron) return json({ ok: false, error: 'unauthorized' }, 401);
  const cutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const db = supabaseAdmin();
  const { data: users, error } = await db.from('web_users').select('*').eq('role', 'merchant').is('plan_code', null).eq('status', 'pending_payment').lt('created_at', cutoff);
  if (error) throw error;
  for (const user of users || []) {
    await db.from('web_users').update({ status: 'blocked', blocked_reason: 'Tidak membeli plan dalam 5 hari.' }).eq('id', user.id);
    await ownerNotify({ userId: user.id, type: 'account_blocked', title: 'Akun diblokir otomatis', message: `${user.email} diblokir karena tidak membeli plan dalam 5 hari.` });
  }
  return json({ ok: true, blocked: users?.length || 0 });
}
