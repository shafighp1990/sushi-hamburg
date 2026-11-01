const test = require('node:test');
const assert = require('node:assert/strict');
const { database } = require('./helpers.cjs');

void test('review provisioning refuses production identity, absent review flag and mismatched origin', async () => {
  const { validateReviewTarget } =
    await import('../scripts/provision-review.mjs');
  const productionId = 'ea414759-dd33-4cef-9ba7-f32063b8638a';
  const config = {
    name: 'sushi-hamburg-review',
    vars: {
      REVIEW_MODE: '1',
      REVIEW_ORIGIN: 'https://sushi-hamburg-review.example.invalid',
    },
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'sushi-hamburg-review',
        database_id: '00000000-0000-4000-8000-000000000001',
      },
    ],
  };
  assert.equal(
    validateReviewTarget(config, productionId).database_name,
    'sushi-hamburg-review',
  );
  for (const unsafe of [
    { ...config, name: 'sushi-hamburg' },
    { ...config, vars: { ...config.vars, REVIEW_MODE: '0' } },
    {
      ...config,
      vars: {
        ...config.vars,
        REVIEW_ORIGIN: 'https://sushi-hamburg.pages.dev',
      },
    },
    {
      ...config,
      vars: {
        ...config.vars,
        REVIEW_ORIGIN: 'https://review.example.invalid/path',
      },
    },
    {
      ...config,
      d1_databases: [{ ...config.d1_databases[0], database_id: productionId }],
    },
    {
      ...config,
      d1_databases: [
        { ...config.d1_databases[0], database_name: 'sushi-hamburg' },
      ],
    },
  ])
    assert.throws(() => validateReviewTarget(unsafe, productionId));
});

void test('review seed is repeatable, hashes all passwords and grants staff only to admin', async () => {
  const { reviewAccountsSql } = await import('../scripts/provision-review.mjs');
  const db = database();
  try {
    db.sql.exec(await reviewAccountsSql());
    db.sql.exec(await reviewAccountsSql());
    const accounts = db.sql
      .prepare(
        'SELECT r.alias,u.email,a.password,s.user_id AS staff FROM review_accounts r JOIN user u ON u.id=r.user_id JOIN account a ON a.userId=u.id LEFT JOIN staff s ON s.user_id=u.id ORDER BY r.alias',
      )
      .all();
    assert.equal(accounts.length, 3);
    for (const account of accounts) {
      assert.equal(account.email, String(account.alias) + '@review.invalid');
      assert.ok(
        typeof account.password === 'string' && account.password.length > 32,
      );
      assert.notEqual(account.password, account.alias);
      assert.equal(Boolean(account.staff), account.alias === 'admin');
    }
    assert.equal(db.sql.prepare('SELECT count(*) n FROM staff').get().n, 1);
  } finally {
    db.sql.close();
  }
});
