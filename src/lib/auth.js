import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from './supabaseAdmin.js';

const COOKIE_NAME = 'satsko_session';
const SESSION_DAYS = 14;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash || '', 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin().from('web_sessions').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt
  });
  if (error) throw error;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await supabaseAdmin().from('web_sessions').delete().eq('token_hash', hashToken(token));
  }
  cookieStore.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const { data: session, error } = await supabaseAdmin()
    .from('web_sessions')
    .select('*, web_users(*)')
    .eq('token_hash', hashToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !session?.web_users) return null;
  return session.web_users;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/portal/masuk');
  if (user.status === 'blocked') redirect('/access-denied?reason=blocked');
  return user;
}

export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== 'owner') redirect('/access-denied?reason=owner_only');
  return user;
}
