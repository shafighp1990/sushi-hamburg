import type { ShopEnv } from './auth';
import type { OrderMessage, OrderMessages } from '../lib/shop-types';
import { fail, string } from './validation';

type MessageRow = {
  id: string;
  sender: OrderMessage['sender'];
  text: string;
  created_at: number;
  client_id: string;
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const toMessage = (row: MessageRow): OrderMessage => ({
  id: row.id,
  sender: row.sender,
  text: row.text,
  createdAt: row.created_at,
});
function cursor(
  value: string | null,
): { createdAt: number; id: string } | null {
  if (!value) return null;
  if (value.length > 300) return fail('INVALID_INPUT');
  try {
    const parsed: unknown = JSON.parse(atob(value));
    if (
      parsed &&
      typeof parsed === 'object' &&
      'createdAt' in parsed &&
      'id' in parsed &&
      typeof parsed.createdAt === 'number' &&
      Number.isSafeInteger(parsed.createdAt) &&
      parsed.createdAt > 0 &&
      typeof parsed.id === 'string' &&
      uuid.test(parsed.id)
    )
      return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    /* Invalid cursor is a client error. */
  }
  return fail('INVALID_INPUT');
}
export async function listOrderMessages(
  env: ShopEnv,
  orderId: string,
  before: string | null,
): Promise<OrderMessages> {
  const previous = cursor(before);
  const query = previous
    ? env.DB.prepare(
        'SELECT id,sender,text,created_at,client_id FROM order_messages WHERE order_id=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 101',
      ).bind(orderId, previous.createdAt, previous.createdAt, previous.id)
    : env.DB.prepare(
        'SELECT id,sender,text,created_at,client_id FROM order_messages WHERE order_id=? ORDER BY created_at DESC,id DESC LIMIT 101',
      ).bind(orderId);
  const { results } = await query.all<MessageRow>();
  const page = results.slice(0, 100),
    oldest = page.at(-1);
  return {
    messages: page.reverse().map(toMessage),
    nextCursor:
      results.length > 100 && oldest
        ? btoa(JSON.stringify({ createdAt: oldest.created_at, id: oldest.id }))
        : null,
  };
}
export async function createOrderMessage(
  env: ShopEnv,
  orderId: string,
  sender: OrderMessage['sender'],
  raw: unknown,
): Promise<OrderMessage> {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('text' in raw) ||
    !('clientMessageId' in raw)
  )
    return fail('INVALID_INPUT');
  const text = string(raw.text, 2000),
    clientId = string(raw.clientMessageId, 36);
  if (!uuid.test(clientId)) return fail('INVALID_KEY');
  const id = crypto.randomUUID(),
    now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      'INSERT OR IGNORE INTO order_messages(id,order_id,sender,text,client_id,created_at) VALUES(?,?,?,?,?,?)',
    ).bind(id, orderId, sender, text, clientId, now),
    env.DB.prepare(
      'UPDATE orders SET updated_at=? WHERE id=? AND changes()=1',
    ).bind(now, orderId),
  ]);
  const row = await env.DB.prepare(
    'SELECT id,sender,text,created_at,client_id FROM order_messages WHERE order_id=? AND sender=? AND client_id=?',
  )
    .bind(orderId, sender, clientId)
    .first<MessageRow>();
  if (!row) return fail('SERVER_ERROR', 500);
  if (row.text !== text) return fail('MESSAGE_CONFLICT', 409);
  return toMessage(row);
}
export function validateEstimatedArrival(
  value: unknown,
  now = Date.now(),
): number | null {
  if (value === null) return null;
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < now - 30 * 60000 ||
    value > now + 30 * 86400000
  )
    return fail('INVALID_ARRIVAL');
  return value;
}
