import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' })
    .notNull()
    .default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});
export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_user_idx').on(t.userId)],
);
export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: integer('accessTokenExpiresAt', {
      mode: 'timestamp_ms',
    }),
    refreshTokenExpiresAt: integer('refreshTokenExpiresAt', {
      mode: 'timestamp_ms',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('account_user_idx').on(t.userId)],
);
export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);
export const rateLimit = sqliteTable('rateLimit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: integer('lastRequest').notNull(),
});
export const profiles = sqliteTable('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  phone: text('phone').notNull().default(''),
  address: text('address').notNull().default(''),
  language: text('language').notNull().default('de'),
  disabled: integer('disabled').notNull().default(0),
});
export const staff = sqliteTable('staff', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at').notNull(),
});
export const catalog = sqliteTable('catalog', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  active: integer('active').notNull().default(1),
  version: integer('version').notNull().default(1),
  updatedAt: integer('updated_at').notNull(),
});
export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    discount: integer('discount').notNull().default(0),
    couponCode: text('coupon_code'),
    tax: text('tax'),
    paidAt: integer('paid_at'),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    guestHash: text('guest_hash'),
    clientKey: text('client_key').notNull().unique(),
    requestHash: text('request_hash').notNull(),
    customer: text('customer').notNull(),
    items: text('items').notNull(),
    subtotal: integer('subtotal').notNull(),
    delivery: integer('delivery'),
    total: integer('total'),
    status: text('status').notNull().default('new'),
    payment: text('payment').notNull().default('cash_on_delivery'),
    paid: integer('paid').notNull().default(0),
    date: text('date').notNull(),
    time: text('time').notNull(),
    zone: text('zone').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    index('orders_user_idx').on(t.userId),
    index('orders_date_idx').on(t.date, t.createdAt),
  ],
);
export const orderEvents = sqliteTable('order_events', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  note: text('note').notNull().default(''),
  createdAt: integer('created_at').notNull(),
});
export const audit = sqliteTable('audit', {
  id: text('id').primaryKey(),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  createdAt: integer('created_at').notNull(),
});
export const throttle = sqliteTable('throttle', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const payments = sqliteTable('payments', {
  orderId: text('order_id')
    .primaryKey()
    .references(() => orders.id),
  provider: text('provider').notNull(),
  providerId: text('provider_id').unique(),
  captureId: text('capture_id'),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('EUR'),
  state: text('state').notNull().default('started'),
  attempt: text('attempt').notNull(),
  checkoutUrl: text('checkout_url'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
export const paymentEvents = sqliteTable('payment_events', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  createdAt: integer('created_at').notNull(),
});
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
export const coupons = sqliteTable('coupons', {
  code: text('code').primaryKey(),
  data: text('data').notNull(),
  active: integer('active').notNull().default(1),
  version: integer('version').notNull().default(1),
  updatedAt: integer('updated_at').notNull(),
});
export const redemptions = sqliteTable(
  'coupon_redemptions',
  {
    orderId: text('order_id')
      .primaryKey()
      .references(() => orders.id),
    code: text('code')
      .notNull()
      .references(() => coupons.code),
    userKey: text('user_key'),
    couponVersion: integer('coupon_version').notNull(),
    released: integer('released').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('redemptions_code_idx').on(t.code, t.released),
    index('redemptions_user_idx').on(t.code, t.userKey),
  ],
);
