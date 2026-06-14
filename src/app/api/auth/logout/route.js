import { NextResponse } from 'next/server';
import { destroySession } from '../../../../lib/auth.js';

export const runtime = 'nodejs';

export async function POST(req) {
  await destroySession();
  return NextResponse.redirect(new URL('/', req.url));
}
