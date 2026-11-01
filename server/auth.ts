import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
export type ShopEnv = {
  DB: D1Database;
  BUCKET: R2Bucket;
  AUTH_SECRET: string;
  SHOP_ORIGIN?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  LOCAL_DEMO?: string;
  REVIEW_MODE?: string;
  REVIEW_ORIGIN?: string;
};
export function authFor(
  env: ShopEnv,
  origin: string,
  onReset?: (url: string) => void,
) {
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32)
    throw new Error('AUTH_NOT_CONFIGURED');
  const base = env.SHOP_ORIGIN || origin;
  return betterAuth({
    appName: 'Sushi HH',
    baseURL: base,
    basePath: '/api/auth',
    secret: env.AUTH_SECRET,
    database: drizzleAdapter(drizzle(env.DB, { schema }), {
      provider: 'sqlite',
      schema,
    }),
    trustedOrigins: [base],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        const target = new URL(url);
        target.searchParams.set('callbackURL', base + '/account');
        if (onReset) {
          onReset(url);
          return;
        }
        if (env.REVIEW_MODE === '1' || !env.RESEND_API_KEY || !env.EMAIL_FROM)
          throw new Error('EMAIL_NOT_CONFIGURED');
        const result = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.EMAIL_FROM,
            to: user.email,
            subject: 'Sushi HH · Password reset / Passwort zurücksetzen',
            text: `Sushi HH\n\n${url}\n\nThis link is private and expires in one hour. If you did not request this, ignore this email.`,
          }),
        });
        if (!result.ok) throw new Error('EMAIL_DELIVERY_FAILED');
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 300, max: 3 },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
      useSecureCookies: base.startsWith('https://'),
      defaultCookieAttributes: { sameSite: 'lax', httpOnly: true },
    },
    telemetry: { enabled: false },
  });
}
