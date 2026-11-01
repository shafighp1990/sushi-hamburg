import type { ShopEnv } from './auth';
/** Review aliases work only on the explicitly configured isolated review origin. */
export function isReviewRequest(env: ShopEnv, origin: string): boolean {
  return (
    env.REVIEW_MODE === '1' &&
    !!env.REVIEW_ORIGIN &&
    env.REVIEW_ORIGIN === origin
  );
}
