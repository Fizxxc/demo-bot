export const runtime = 'nodejs';

export async function GET() {
  return Response.json({ ok: true, service: 'tele-auto-order-node' });
}
