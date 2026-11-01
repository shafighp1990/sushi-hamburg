// Prepares SQL only. The operator applies it to the explicitly isolated review D1.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { hashPassword } from 'better-auth/crypto';

const accounts = [
  {
    alias: 'admin',
    email: 'admin@review.invalid',
    name: 'Review administrator',
    staff: true,
  },
  {
    alias: 'kunde',
    email: 'kunde@review.invalid',
    name: 'Review customer',
    staff: false,
  },
  {
    alias: 'kunde2',
    email: 'kunde2@review.invalid',
    name: 'Second review customer',
    staff: false,
  },
];
const sql = (value) => "'" + String(value).replaceAll("'", "''") + "'";

export async function reviewAccountsSql() {
  const statements = [
    '-- Isolated review accounts only; no real customers or deliveries.',
  ];
  const now = Date.now();
  for (const account of accounts) {
    const userId = crypto.randomUUID();
    const email = sql(account.email);
    const selected = `SELECT id FROM user WHERE email=${email}`;
    statements.push(
      `INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(${sql(userId)},${sql(account.name)},${email},1,${now},${now}) ON CONFLICT(email) DO UPDATE SET name=excluded.name,emailVerified=1,updatedAt=excluded.updatedAt;`,
      `DELETE FROM session WHERE userId IN (${selected});`,
      `DELETE FROM account WHERE providerId='credential' AND userId IN (${selected});`,
      `INSERT INTO account(id,accountId,providerId,userId,password,createdAt,updatedAt) SELECT ${sql(crypto.randomUUID())},id,'credential',id,${sql(await hashPassword(account.alias))},${now},${now} FROM user WHERE email=${email};`,
      `INSERT INTO review_accounts(alias,user_id) SELECT ${sql(account.alias)},id FROM user WHERE email=${email} ON CONFLICT(alias) DO UPDATE SET user_id=excluded.user_id;`,
      account.staff
        ? `INSERT OR IGNORE INTO staff(user_id,created_at) SELECT id,${now} FROM user WHERE email=${email};`
        : `DELETE FROM staff WHERE user_id IN (${selected});`,
    );
  }
  return statements.join('\n') + '\n';
}

export function validateReviewTarget(config, productionDatabaseId) {
  if (!/^sushi-hamburg-review(?:-[a-z0-9-]+)?$/.test(config.name || ''))
    throw new Error(
      'Worker name must identify the separate Sushi review environment.',
    );
  if (config.vars?.REVIEW_MODE !== '1')
    throw new Error(
      'REVIEW_MODE must be explicitly enabled in the review configuration.',
    );
  const origin = new URL(config.vars?.REVIEW_ORIGIN || '');
  if (
    origin.protocol !== 'https:' ||
    origin.origin !== config.vars.REVIEW_ORIGIN
  )
    throw new Error('REVIEW_ORIGIN must be the exact HTTPS review origin.');
  if (origin.hostname === 'sushi-hamburg.pages.dev')
    throw new Error(
      'The production origin cannot be provisioned with review accounts.',
    );
  const databases = config.d1_databases || [];
  if (databases.length !== 1 || databases[0].binding !== 'DB')
    throw new Error(
      'The review configuration must bind exactly one isolated DB.',
    );
  const target = databases[0];
  if (
    !/^sushi-hamburg-review(?:-[a-z0-9-]+)?$/.test(target.database_name || '')
  )
    throw new Error(
      'Database name must identify a separate Sushi review database.',
    );
  if (
    !/^[a-f0-9-]{36}$/i.test(target.database_id || '') ||
    target.database_id === productionDatabaseId ||
    target.database_id === 'ea414759-dd33-4cef-9ba7-f32063b8638a'
  )
    throw new Error('Refusing the production or an invalid database ID.');
  return target;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({
    options: {
      config: { type: 'string' },
      output: { type: 'string' },
      'confirm-database-id': { type: 'string' },
    },
  });
  if (!values.config || !values['confirm-database-id'])
    throw new Error(
      'Usage: node scripts/provision-review.mjs --config review.json --confirm-database-id UUID [--output .wrangler/review-accounts.sql]',
    );
  const config = JSON.parse(await readFile(values.config, 'utf8'));
  const production = JSON.parse(
    await readFile(new URL('../wrangler.pages.jsonc', import.meta.url), 'utf8'),
  );
  const target = validateReviewTarget(
    config,
    production.d1_databases[0].database_id,
  );
  if (values['confirm-database-id'] !== target.database_id)
    throw new Error(
      'Explicitly confirmed database ID does not match the review configuration.',
    );
  const output = resolve(values.output || '.wrangler/review-accounts.sql');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, await reviewAccountsSql(), { mode: 0o600 });
  console.log(
    `Prepared three review accounts for ${target.database_name} (${target.database_id}) in ${output}. No database was changed.`,
  );
}
