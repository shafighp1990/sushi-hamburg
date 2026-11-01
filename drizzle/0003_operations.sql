CREATE TABLE newsletter_subscribers (
 id TEXT PRIMARY KEY, user_id TEXT UNIQUE REFERENCES user(id) ON DELETE CASCADE, email TEXT NOT NULL UNIQUE,
 language TEXT NOT NULL DEFAULT 'de', state TEXT NOT NULL DEFAULT 'pending', frequency TEXT NOT NULL DEFAULT 'weekly',
 consent_version TEXT NOT NULL, consent_at INTEGER NOT NULL, confirmed_at INTEGER, unsubscribed_at INTEGER,
 generation INTEGER NOT NULL DEFAULT 1, confirm_hash TEXT, confirm_expires INTEGER, updated_at INTEGER NOT NULL
);
CREATE TABLE newsletter_campaigns (
 id TEXT PRIMARY KEY, data TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0, next_send_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE mail_outbox (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, recipient TEXT NOT NULL, subscriber_id TEXT REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
 generation INTEGER, payload TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0,
 next_at INTEGER NOT NULL, lease_until INTEGER NOT NULL DEFAULT 0, first_attempt_at INTEGER, sent_at INTEGER, provider_id TEXT, error TEXT,
 created_at INTEGER NOT NULL
);
CREATE INDEX mail_due_idx ON mail_outbox(state,next_at);
CREATE TABLE order_documents (
 number INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL REFERENCES orders(id), kind TEXT NOT NULL,
 snapshot TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(order_id,kind)
);
