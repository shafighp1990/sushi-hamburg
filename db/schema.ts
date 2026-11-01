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
  postcode: text('postcode').notNull().default(''),
  city: text('city').notNull().default('Hamburg'),
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
    estimatedArrivalAt: integer('estimated_arrival_at'),
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

export const newsletterSubscribers = sqliteTable('newsletter_subscribers', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  language: text('language').notNull().default('de'),
  state: text('state').notNull().default('pending'),
  frequency: text('frequency').notNull().default('weekly'),
  consentVersion: text('consent_version').notNull(),
  consentAt: integer('consent_at').notNull(),
  confirmedAt: integer('confirmed_at'),
  unsubscribedAt: integer('unsubscribed_at'),
  generation: integer('generation').notNull().default(1),
  confirmHash: text('confirm_hash'),
  confirmExpires: integer('confirm_expires'),
  updatedAt: integer('updated_at').notNull(),
});
export const newsletterCampaigns = sqliteTable('newsletter_campaigns', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  active: integer('active').notNull().default(0),
  nextSendAt: integer('next_send_at').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
export const mailOutbox = sqliteTable(
  'mail_outbox',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    recipient: text('recipient').notNull(),
    subscriberId: text('subscriber_id').references(
      () => newsletterSubscribers.id,
      { onDelete: 'cascade' },
    ),
    generation: integer('generation'),
    payload: text('payload').notNull(),
    state: text('state').notNull().default('queued'),
    attempts: integer('attempts').notNull().default(0),
    nextAt: integer('next_at').notNull(),
    leaseUntil: integer('lease_until').notNull().default(0),
    firstAttemptAt: integer('first_attempt_at'),
    sentAt: integer('sent_at'),
    providerId: text('provider_id'),
    error: text('error'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('mail_due_idx').on(t.state, t.nextAt)],
);
export const orderDocuments = sqliteTable(
  'order_documents',
  {
    number: integer('number').primaryKey({ autoIncrement: true }),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id),
    kind: text('kind').notNull(),
    snapshot: text('snapshot').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('order_documents_order_kind').on(t.orderId, t.kind)],
);

export const orderMessages = sqliteTable(
  'order_messages',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    sender: text('sender', { enum: ['customer', 'team'] }).notNull(),
    text: text('text').notNull(),
    clientId: text('client_id').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('order_messages_retry_idx').on(t.orderId, t.sender, t.clientId),
    index('order_messages_order_idx').on(t.orderId, t.createdAt, t.id),
  ],
);

export const reviewAccounts = sqliteTable('review_accounts', {
  alias: text('alias').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
});
