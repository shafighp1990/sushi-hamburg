import type { MailRow, SubscriberRow } from './types';
import { string } from './validation';
type MailContent = {
  subject?: string;
  text?: string;
  headers?: Record<string, string>;
  attachments?: { filename: string; content: string }[];
};
type MailWire = MailContent & { from: string; to: string };
type MailPayload = MailContent & {
  orderId?: string;
  prepared?: MailContent;
  wire?: MailWire;
};
import type { ShopEnv } from './auth';
import { seal, unseal, privateSetting } from './secrets';
export async function mailEnvironment(env: ShopEnv) {
  return { ...env, ...(await privateSetting(env, 'email')) };
}
export async function enqueueMail(
  env: ShopEnv,
  id: string,
  kind: string,
  recipient: string,
  payload: unknown,
  subscriber?: { id: string; generation: number },
) {
  await env.DB.prepare(
    'INSERT OR IGNORE INTO mail_outbox(id,kind,recipient,subscriber_id,generation,payload,next_at,created_at) VALUES(?,?,?,?,?,?,?,?)',
  )
    .bind(
      id,
      kind,
      recipient,
      subscriber?.id || null,
      subscriber?.generation || null,
      await seal(env, payload),
      Date.now(),
      Date.now(),
    )
    .run();
}
// A durable outbox survives provider downtime. Ambiguous retries stop before the provider's 24-hour idempotency window expires.
export async function dispatchMail(env: ShopEnv, origin: string) {
  env = await mailEnvironment(env);
  if (env.LOCAL_DEMO === '1' || env.REVIEW_MODE === '1')
    return {
      sent: 0,
      configured: !!(env.RESEND_API_KEY && env.EMAIL_FROM),
      local: true,
    };
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
    return { sent: 0, configured: false };
  const rows = await env.DB.prepare(
    "SELECT id FROM mail_outbox WHERE state IN ('queued','retry','sending') AND next_at<=? AND lease_until<? ORDER BY CASE kind WHEN 'documents' THEN 0 WHEN 'confirmation' THEN 1 ELSE 2 END,created_at LIMIT 12",
  )
    .bind(Date.now(), Date.now())
    .all<{ id: string }>();
  let sent = 0;
  for (const item of rows.results) {
    const now = Date.now();
    const row = await env.DB.prepare(
      "UPDATE mail_outbox SET state='sending',lease_until=?,attempts=attempts+1 WHERE id=? AND state IN ('queued','retry','sending') AND lease_until<? RETURNING *",
    )
      .bind(now + 120000, item.id, now)
      .first<MailRow>();
    if (!row) continue;
    try {
      if (row.first_attempt_at && row.first_attempt_at < now - 23 * 3600000)
        throw Error('MANUAL_REVIEW_REQUIRED');
      if (row.subscriber_id) {
        const s = await env.DB.prepare(
          'SELECT s.state,s.email,s.generation,s.frequency,u.email current_email,COALESCE(p.disabled,0) disabled FROM newsletter_subscribers s JOIN user u ON u.id=s.user_id LEFT JOIN profiles p ON p.user_id=u.id WHERE s.id=?',
        )
          .bind(row.subscriber_id)
          .first<
            Pick<
              SubscriberRow,
              'state' | 'email' | 'generation' | 'frequency'
            > & { current_email: string; disabled: number }
          >();
        if (
          !s ||
          s.disabled ||
          s.current_email !== s.email ||
          s.email !== row.recipient ||
          s.generation !== row.generation ||
          (row.kind === 'marketing'
            ? s.state !== 'active'
            : s.state !== 'pending')
        ) {
          await env.DB.prepare(
            "UPDATE mail_outbox SET state='cancelled',lease_until=0 WHERE id=?",
          )
            .bind(row.id)
            .run();
          continue;
        }
        if (row.kind === 'marketing' && !row.first_attempt_at) {
          const last = await env.DB.prepare(
            "SELECT MAX(sent_at) n FROM mail_outbox WHERE subscriber_id=? AND kind='marketing' AND state='sent'",
          )
            .bind(row.subscriber_id)
            .first<{ n: number | null }>();
          const interval =
            (s.frequency === 'daily' ? 1 : s.frequency === 'weekly' ? 7 : 30) *
            86400000;
          if (last?.n && last.n + interval > now) {
            await env.DB.prepare(
              "UPDATE mail_outbox SET state='queued',next_at=?,lease_until=0,attempts=attempts-1 WHERE id=?",
            )
              .bind(last.n + interval, row.id)
              .run();
            continue;
          }
        }
      }
      if (!row.first_attempt_at)
        await env.DB.prepare(
          'UPDATE mail_outbox SET first_attempt_at=? WHERE id=?',
        )
          .bind(now, row.id)
          .run();
      let payload = await unseal<MailPayload>(env, row.payload);
      const cached = payload.wire;
      if (!cached && row.kind === 'documents') {
        if (payload.prepared) payload = payload.prepared;
        else {
          const { documentMail } = await import('./documents');
          const prepared = await documentMail(
            env,
            string(payload.orderId, 80),
            origin,
          );
          await env.DB.prepare('UPDATE mail_outbox SET payload=? WHERE id=?')
            .bind(await seal(env, { ...payload, prepared }), row.id)
            .run();
          payload = prepared;
        }
      }
      const wire = cached || {
        from: env.EMAIL_FROM,
        to: row.recipient,
        ...payload,
      };
      if (!cached)
        await env.DB.prepare('UPDATE mail_outbox SET payload=? WHERE id=?')
          .bind(await seal(env, { wire }), row.id)
          .run();
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': row.id,
        },
        body: JSON.stringify(wire),
        signal: AbortSignal.timeout(25000),
      });
      if (!r.ok)
        throw Error(
          r.status === 429 ? 'EMAIL_RATE_LIMIT' : 'EMAIL_DELIVERY_FAILED',
        );
      const result: unknown = await r.json();
      if (
        !result ||
        typeof result !== 'object' ||
        !('id' in result) ||
        typeof result.id !== 'string'
      )
        throw Error('EMAIL_DELIVERY_FAILED');
      await env.DB.prepare(
        "UPDATE mail_outbox SET state='sent',sent_at=?,provider_id=?,lease_until=0,error=NULL WHERE id=?",
      )
        .bind(Date.now(), result.id, row.id)
        .run();
      sent++;
    } catch (e) {
      const code = e instanceof Error ? e.message : 'EMAIL_DELIVERY_FAILED';
      await env.DB.prepare(
        'UPDATE mail_outbox SET state=?,error=?,next_at=?,lease_until=0 WHERE id=?',
      )
        .bind(
          code === 'MANUAL_REVIEW_REQUIRED'
            ? 'review'
            : row.attempts >= 8
              ? 'failed'
              : 'retry',
          /^[A-Z_]+$/.test(code) ? code : 'EMAIL_DELIVERY_FAILED',
          Date.now() +
            Math.min(3600000, 60000 * 2 ** Math.min(row.attempts, 6)),
          row.id,
        )
        .run();
    }
  }
  return { sent, configured: true };
}
