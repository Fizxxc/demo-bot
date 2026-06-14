import { dashboardApiKey } from './config.js';

export function json(data, status = 200) {
  return Response.json(data, { status });
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function assertDashboardAuth(req) {
  const expected = dashboardApiKey();
  if (!expected) return;

  const provided = req.headers.get('x-admin-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (provided !== expected) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
}

export function handleRouteError(error) {
  const status = error?.status || 500;
  const message = status === 500 ? 'Internal server error' : error.message;
  console.error(error);
  return json({ ok: false, error: message }, status);
}
