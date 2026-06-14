import { z } from 'zod';
import { assertDashboardAuth, handleRouteError, json, readJson } from '../../../../../lib/http.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { getPakasirConfig } from '../../../../../lib/pakasir.js';

export const runtime = 'nodejs';

const schema = z.object({ invoiceId: z.string().uuid() });

export async function POST(req) {
  try {
    assertDashboardAuth(req);
    const { invoiceId } = schema.parse(await readJson(req));
    const db = supabaseAdmin();

    const { data: invoice, error } = await db
      .from('payment_invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();

    if (error) throw error;
    if (!invoice) return json({ ok: false, error: 'invoice_not_found' }, 404);

    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .select('*')
      .eq('id', invoice.tenant_id)
      .maybeSingle();

    if (tenantError) throw tenantError;
    if (!tenant) return json({ ok: false, error: 'tenant_not_found' }, 404);

    const config = getPakasirConfig(tenant);
    if (!config.project || !config.apiKey) return json({ ok: false, error: 'pakasir_not_configured' }, 400);

    const res = await fetch('https://app.pakasir.com/api/paymentsimulation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        project: config.project,
        order_id: invoice.order_id,
        amount: invoice.amount,
        api_key: config.apiKey
      })
    });

    const data = await res.json().catch(() => ({}));
    return json({ ok: res.ok, response: data }, res.ok ? 200 : res.status);
  } catch (error) {
    return handleRouteError(error);
  }
}
