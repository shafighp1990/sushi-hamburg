import type { PaymentEnv } from './payments';
import { dueCampaigns } from './newsletter';
import { dispatchMail } from './mail';
export async function runJobs(env: PaymentEnv, origin: string) {
  const { ensureDocuments } = await import('./documents');
  const rows = await env.DB.prepare(
    "SELECT id FROM orders WHERE status!='cancelled' AND total IS NOT NULL AND (paid=1 OR (payment='cash_on_delivery' AND status!='new')) AND NOT EXISTS(SELECT 1 FROM order_documents d WHERE d.order_id=orders.id AND d.kind=CASE WHEN orders.paid=1 THEN 'receipt' ELSE 'invoice' END) LIMIT 20",
  ).all<{ id: string }>();
  for (const o of rows.results) await ensureDocuments(env, o.id);
  await dueCampaigns(env, origin);
  return dispatchMail(env, origin);
}
