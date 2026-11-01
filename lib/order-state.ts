import type { Order } from './shop-api';

/** Delayed polls must never replace a newer, acknowledged staff edit. */
export function mergeOrderVersions(
  current: Order[],
  incoming: Order[],
): Order[] {
  const latest = new Map(current.map((order) => [order.id, order]));
  for (const order of incoming) {
    const previous = latest.get(order.id);
    if (!previous || order.version >= previous.version)
      latest.set(order.id, order);
  }
  return [...latest.values()]
    .sort((a, b) => (b.paidAt || b.createdAt) - (a.paidAt || a.createdAt))
    .slice(0, 300);
}
