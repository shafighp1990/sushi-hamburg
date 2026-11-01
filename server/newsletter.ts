import { isOneOf } from '../lib/value-guards';
import type { Customer, Campaign } from '../lib/shop-types';
import type { Product, Language } from '../lib/catalog';
import type { SubscriberRow, CampaignRow } from './types';
import type { ShopEnv } from './auth';
import { fail, string, record } from './validation';
import { capability, equal } from './secrets';
import { enqueueMail } from './mail';
import { getSettings } from './commerce';
export const consentVersion = 'newsletter-5pct-v1';
export async function newsletterStatus(env: ShopEnv, userId: string) {
  const row = await env.DB.prepare(
    'SELECT state,frequency,confirmed_at FROM newsletter_subscribers WHERE user_id=?',
  )
    .bind(userId)
    .first();
  return row || { state: 'unsubscribed', frequency: 'weekly' };
}
export async function subscribe(
  env: ShopEnv,
  user: Pick<Customer, 'id' | 'email'>,
  input: unknown,
  origin: string,
) {
  const b = record(input);
  if (
    typeof b.enabled !== 'boolean' ||
    !isOneOf(b.frequency, ['daily', 'weekly', 'monthly']) ||
    !isOneOf(b.language, ['de', 'uk', 'en', 'fa'])
  )
    fail('INVALID_INPUT');
  const previous = await env.DB.prepare(
    'SELECT * FROM newsletter_subscribers WHERE user_id=?',
  )
    .bind(user.id)
    .first<SubscriberRow>();
  if (!b.enabled) {
    if (previous) await unsubscribe(env, previous.id);
    return { state: 'unsubscribed' };
  }
  if (previous?.state === 'active' && previous.email === user.email) {
    await env.DB.prepare(
      'UPDATE newsletter_subscribers SET frequency=?,language=?,updated_at=? WHERE id=?',
    )
      .bind(b.frequency, b.language, Date.now(), previous.id)
      .run();
    return { state: 'active' };
  }
  const id = previous?.id || crypto.randomUUID(),
    generation = (previous?.generation || 0) + 1,
    now = Date.now();
  const token = await capability(env, `confirm:${id}:${generation}`);
  await env.DB.prepare(
    "INSERT INTO newsletter_subscribers(id,user_id,email,language,state,frequency,consent_version,consent_at,generation,confirm_hash,confirm_expires,updated_at) VALUES(?,?,?,?,'pending',?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,language=excluded.language,state='pending',frequency=excluded.frequency,consent_version=excluded.consent_version,consent_at=excluded.consent_at,generation=excluded.generation,confirm_hash=excluded.confirm_hash,confirm_expires=excluded.confirm_expires,confirmed_at=NULL,updated_at=excluded.updated_at",
  )
    .bind(
      id,
      user.id,
      user.email,
      b.language,
      b.frequency,
      consentVersion,
      now,
      generation,
      await capability(env, 'hash:' + token),
      now + 48 * 3600000,
      now,
    )
    .run();
  const url = `${env.SHOP_ORIGIN || origin}/newsletter#action=confirm&id=${id}&token=${token}`;
  const text = {
    de: 'Bitte bestätigen Sie Ihren Sushi HH Newsletter. Danach erhalten Sie 5% zusätzlichen Rabatt auf Speisen. Sie können jederzeit abbestellen.',
    uk: 'Підтвердьте підписку на розсилку Sushi HH. Після цього діятиме додаткова знижка 5% на їжу. Відписатися можна будь-коли.',
    en: 'Confirm your Sushi HH newsletter subscription for an extra 5% off food. You can unsubscribe at any time.',
    fa: 'اشتراک خبرنامهٔ Sushi HH را تأیید کنید تا ۵٪ تخفیف اضافه روی غذا فعال شود. هر زمان می‌توانید لغو کنید.',
  }[b.language];
  await enqueueMail(
    env,
    `confirm-${id}-${generation}`,
    'confirmation',
    user.email,
    {
      subject: 'Sushi HH · Newsletter confirmation',
      text: `${text}\n\n${url}`,
    },
    { id, generation },
  );
  return { state: 'pending' };
}
export async function confirmSubscription(
  env: ShopEnv,
  id: string,
  token: string,
) {
  const s = await env.DB.prepare(
    'SELECT * FROM newsletter_subscribers WHERE id=?',
  )
    .bind(id)
    .first<SubscriberRow>();
  if (
    !s ||
    s.state !== 'pending' ||
    (s.confirm_expires || 0) < Date.now() ||
    !equal(await capability(env, 'hash:' + token), s.confirm_hash || '')
  )
    fail('INVALID_LINK');
  await env.DB.prepare(
    "UPDATE newsletter_subscribers SET state='active',confirmed_at=?,updated_at=?,confirm_hash=NULL WHERE id=? AND state='pending' AND generation=?",
  )
    .bind(Date.now(), Date.now(), id, s.generation)
    .run();
  return { state: 'active' };
}
export async function unsubscribe(env: ShopEnv, id: string) {
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE newsletter_subscribers SET state='unsubscribed',generation=generation+1,unsubscribed_at=?,updated_at=?,confirm_hash=NULL WHERE id=?",
    ).bind(Date.now(), Date.now(), id),
    env.DB.prepare(
      "UPDATE mail_outbox SET state='cancelled' WHERE subscriber_id=? AND state IN ('queued','retry')",
    ).bind(id),
  ]);
  return { state: 'unsubscribed' };
}
export async function unsubscribeToken(
  env: ShopEnv,
  id: string,
  token: string,
) {
  if (!equal(token, await capability(env, 'unsubscribe:' + id)))
    fail('INVALID_LINK');
  return unsubscribe(env, id);
}
export function validateCampaign(input: unknown): Campaign {
  const b = record(input),
    subjects = record(b.subject || {}),
    texts = record(b.text || {});
  if (
    !isOneOf(b.repeat, ['once', 'daily', 'weekly', 'monthly']) ||
    typeof b.active !== 'boolean'
  )
    fail('INVALID_INPUT');
  const subject: Record<Language, string> = { de: '', uk: '', en: '', fa: '' },
    text: Record<Language, string> = { de: '', uk: '', en: '', fa: '' };
  for (const l of ['de', 'uk', 'en', 'fa'] as const) {
    subject[l] = string(subjects[l] || '', 150, b.active);
    text[l] = string(texts[l] || '', 8000, b.active);
  }
  const next = Number(b.nextSendAt);
  if (!Number.isSafeInteger(next) || next < 0) fail('INVALID_INPUT');
  return {
    subject,
    text,
    repeat: b.repeat,
    active: b.active,
    nextSendAt: next,
  };
}
export async function queueCampaign(
  env: ShopEnv,
  id: string,
  data: Pick<Campaign, 'subject' | 'text' | 'repeat' | 'revision'>,
  occurrence: number,
  origin: string,
) {
  const audience = await env.DB.prepare(
    "SELECT s.* FROM newsletter_subscribers s JOIN user u ON u.id=s.user_id LEFT JOIN profiles p ON p.user_id=u.id WHERE s.state='active' AND s.email=u.email AND COALESCE(p.disabled,0)=0",
  ).all<SubscriberRow>();
  for (const s of audience.results) {
    const cadence =
        data.repeat === 'daily' ? 1 : data.repeat === 'weekly' ? 7 : 30,
      preference =
        s.frequency === 'daily' ? 1 : s.frequency === 'weekly' ? 7 : 30;
    const last = await env.DB.prepare(
      "SELECT MAX(created_at) n FROM mail_outbox WHERE subscriber_id=? AND kind='marketing' AND state NOT IN ('cancelled','failed')",
    )
      .bind(s.id)
      .first<{ n: number | null }>();
    if (
      data.repeat !== 'once' &&
      (last?.n || 0) > occurrence - Math.max(cadence, preference) * 86400000
    )
      continue;
    const url = `${env.SHOP_ORIGIN || origin}/newsletter#action=unsubscribe&id=${s.id}&token=${await capability(env, 'unsubscribe:' + s.id)}`;
    const oneclick = `${env.SHOP_ORIGIN || origin}/api/newsletter/unsubscribe?id=${s.id}&token=${await capability(env, 'unsubscribe:' + s.id)}`;
    const mailId = `campaign-${id}-${data.revision || 0}-${occurrence}-${s.id}-${s.generation}`;
    await enqueueMail(
      env,
      mailId,
      'marketing',
      s.email,
      {
        subject: data.subject[s.language] || data.subject.de,
        text: `${data.text[s.language] || data.text.de}\n\nSushi HH\n${(await getSettings(env)).issuer.address}\n\nAbmelden / Unsubscribe / Відписатися / لغو اشتراک: ${url}`,
        headers: {
          'List-Unsubscribe': `<${oneclick}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      },
      s,
    );
    if (data.repeat === 'once' && last?.n)
      await env.DB.prepare(
        "UPDATE mail_outbox SET next_at=MAX(next_at,?) WHERE id=? AND state='queued'",
      )
        .bind(last.n + preference * 86400000, mailId)
        .run();
  }
}
export async function dueCampaigns(env: ShopEnv, origin: string) {
  const settings = await getSettings(env);
  if (!settings.issuer.name || !settings.issuer.address) return;
  const rows = await env.DB.prepare(
    'SELECT * FROM newsletter_campaigns WHERE active=1 AND next_send_at<=? ORDER BY next_send_at LIMIT 4',
  )
    .bind(Date.now())
    .all<CampaignRow>();
  for (const c of rows.results) {
    const d = JSON.parse(c.data) as Pick<
      Campaign,
      'subject' | 'text' | 'repeat' | 'revision'
    >;
    await queueCampaign(env, c.id, d, c.next_send_at, origin);
    const next = new Date(c.next_send_at);
    if (d.repeat === 'monthly') next.setUTCMonth(next.getUTCMonth() + 1);
    else next.setUTCDate(next.getUTCDate() + (d.repeat === 'weekly' ? 7 : 1));
    await env.DB.prepare(
      'UPDATE newsletter_campaigns SET active=?,next_send_at=?,updated_at=? WHERE id=? AND next_send_at=?',
    )
      .bind(
        d.repeat === 'once' ? 0 : 1,
        Math.max(next.getTime(), Date.now() + 60000),
        Date.now(),
        c.id,
        c.next_send_at,
      )
      .run();
  }
}
export async function newProductCampaign(env: ShopEnv, p: Product) {
  if (!(await getSettings(env)).newsletter.newProducts) return;
  const id = 'product-' + p.id;
  const subject: Record<Language, string> = { de: '', uk: '', en: '', fa: '' },
    text: Record<Language, string> = { de: '', uk: '', en: '', fa: '' };
  for (const l of ['de', 'uk', 'en', 'fa'] as const) {
    subject[l] = `Sushi HH · ${p.name[l]}`;
    text[l] =
      `${p.name[l]}\n${(p.price / 100).toFixed(2)} EUR\n${p.description?.[l] || ''}\n${env.SHOP_ORIGIN || ''}/product?id=${encodeURIComponent(p.id)}`;
  }
  await env.DB.prepare(
    'INSERT OR IGNORE INTO newsletter_campaigns(id,data,active,next_send_at,created_at,updated_at) VALUES(?,?,1,?,?,?)',
  )
    .bind(
      id,
      JSON.stringify({ subject, text, repeat: 'once' }),
      Date.now(),
      Date.now(),
      Date.now(),
    )
    .run();
}
