import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { hashPassword } from 'better-auth/crypto';
import { reviewAccountsSql } from '../scripts/provision-review.mjs';
import { verifyStoredArrival } from './isolated-state-regressions.mjs';

process.env.WRANGLER_SEND_METRICS = 'false';
process.env.WRANGLER_WRITE_LOGS = 'false';
const { unstable_splitSqlQuery: splitSqlQuery } = await import('wrangler');
const root = fileURLToPath(new URL('../', import.meta.url));
const compiled = await build({
  stdin: {
    contents:
      "import { handleShop } from './server/api'; export default { fetch(request, env, ctx) { return handleShop(request, env, ctx); } };",
    resolveDir: root,
    sourcefile: 'isolated-api-entry.ts',
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  conditions: ['workerd', 'worker', 'browser'],
  external: ['node:*', 'cloudflare:workers'],
  tsconfig: root + 'tsconfig.json',
});
const blockedRequests = [];
const runtimeOptions = {
  host: '127.0.0.1',
  port: 0,
  modules: [
    {
      type: 'ESModule',
      path: 'api-worker.mjs',
      contents: compiled.outputFiles[0].text,
    },
  ],
  compatibilityDate: '2026-05-15',
  compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'],
  r2Buckets: ['BUCKET'],
  bindings: {
    AUTH_SECRET: crypto.randomUUID() + crypto.randomUUID(),
    LOCAL_DEMO: '1',
  },
  outboundService(request) {
    blockedRequests.push(new URL(request.url).origin);
    return new Response('External network is disabled in integration tests.', {
      status: 503,
    });
  },
};
let runtime = new Miniflare(runtimeOptions);

function run(script, origin) {
  return new Promise((resolve, reject) => {
    const process = spawn(
      globalThis.process.execPath,
      [root + 'tests/' + script],
      {
        cwd: root,
        stdio: 'inherit',
        env: { ...globalThis.process.env, SUSHI_LOCAL_URL: origin },
      },
    );
    process.once('error', reject);
    process.once('exit', (code, signal) =>
      code === 0
        ? resolve()
        : reject(new Error(`${script} failed: ${signal || code}`)),
    );
  });
}

try {
  const address = await runtime.ready;
  const db = await runtime.getD1Database('DB');
  const migrations = (await readdir(root + 'drizzle'))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  for (const name of migrations) {
    for (const query of splitSqlQuery(
      await readFile(root + 'drizzle/' + name, 'utf8'),
    )) {
      await db.prepare(query).run();
    }
  }
  const id = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare(
      'INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,1,?,?)',
    )
    .bind(id, 'Local test administrator', 'admin@local.invalid', now, now)
    .run();
  await db
    .prepare(
      'INSERT INTO account (id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)',
    )
    .bind(
      crypto.randomUUID(),
      id,
      'credential',
      id,
      await hashPassword('admin'),
      now,
      now,
    )
    .run();
  await db
    .prepare('INSERT INTO staff (user_id,created_at) VALUES (?,?)')
    .bind(id, now)
    .run();
  console.log(
    `Applied ${migrations.length} migrations to isolated D1; outbound network disabled.`,
  );
  await verifyStoredArrival(runtime, address.origin);
  for (const script of [
    'integration.mjs',
    'commerce-integration.mjs',
    'order-communication.integration.mjs',
  ]) {
    await run(script, address.origin);
  }
  // Review has its own fresh storage and exact configured origin. Do not reuse
  // normal-mode users, permissions, orders or payment configuration.
  await runtime.dispose();
  runtime = new Miniflare({
    ...runtimeOptions,
    port: Number(address.port),
    bindings: {
      AUTH_SECRET: crypto.randomUUID() + crypto.randomUUID(),
      REVIEW_MODE: '1',
      REVIEW_ORIGIN: address.origin,
      RESEND_API_KEY: 'isolated-fixture-not-a-real-key',
      EMAIL_FROM: 'qa@review.invalid',
      STRIPE_SECRET_KEY: 'sk_test_isolated_fixture',
      STRIPE_WEBHOOK_SECRET: 'whsec_isolated_fixture',
    },
  });
  await runtime.ready;
  const reviewDb = await runtime.getD1Database('DB');
  for (const name of migrations) {
    for (const query of splitSqlQuery(
      await readFile(root + 'drizzle/' + name, 'utf8'),
    ))
      await reviewDb.prepare(query).run();
  }
  for (const query of splitSqlQuery(await reviewAccountsSql()))
    await reviewDb.prepare(query).run();
  await run('review.integration.mjs', address.origin);
  assert.deepEqual(
    blockedRequests,
    [],
    'Tests must not attempt payment, email or external requests',
  );
  console.log(
    'All isolated API integration suites passed; no production data was accessed.',
  );
} finally {
  await runtime.dispose();
}
