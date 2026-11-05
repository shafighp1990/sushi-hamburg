# Sushi HH — Hamburg

A full-stack sushi catering application built with React, TypeScript, Vinext and Cloudflare Pages Functions. It supports German, Ukrainian, English and Persian, including right-to-left Persian layouts and persistent language selection.

## Class review

Open the [review website](https://sushi-hamburg-review.pages.dev). Visitors can order as guests without creating an account or entering an email address.

| Role | Page | Username | Password |
| --- | --- | --- | --- |
| Manager | [Admin sign-in](https://sushi-hamburg-review.pages.dev/admin/login) | `admin` | `admin` |
| Customer | [Customer account](https://sushi-hamburg-review.pages.dev/account) | `kunde` | `kunde` |
| Second customer | [Customer account](https://sushi-hamburg-review.pages.dev/account) | `kunde2` | `kunde2` |

These are intentional test accounts for the separate review instance. Test orders are saved in its review database, but are not binding and do not trigger real deliveries, payments or emails. Use example details when reviewing the site. Review account aliases are enabled only when `REVIEW_MODE=1` and the request matches `REVIEW_ORIGIN`.

## Current features

- A menu with 40 supplied dishes, additional owner-created products, a photo gallery and 46 sushi knowledge articles.
- Guest checkout with pay on delivery. Orders remain new and unpaid until staff review them. The restaurant calls the supplied phone number to confirm availability, delivery time and delivery costs; staff then record the confirmation in the admin panel.
- Private guest tracking links, customer accounts, order history, delivery status, estimated arrival times and private customer–restaurant messages.
- An owner dashboard for orders, customers, product prices/photos, new products, offers, opening hours and settings. A new product needs a name and description in one language; missing translations display the supplied text until the owner adds them.
- Product tax rates default to 0%. The existing shop's small-business VAT treatment is preserved; confirmed order totals show no VAT separately.

The application stores orders and customer details in Cloudflare D1, and uploaded images in R2. The cart and guest tracking links are saved in the visitor's browser. Telegram remains a contact link; checkout creates an application order directly.

## Local development

Use Node.js 24, matching CI; the declared minimum is 22.13.

```sh
npm ci
npm run dev
```

The development server listens at `http://127.0.0.1:5173`. Full order/admin functionality also requires local D1 and R2 bindings, the [database migrations](drizzle/), an `AUTH_SECRET` of at least 32 characters and a `SHOP_ORIGIN` matching the local origin. Local secrets belong in the ignored `.dev.vars` file.

[Local admin provisioning](scripts/seed-local-admin.mjs) is a loopback-only helper for a migrated `LOCAL_DEMO=1` worker preview; it is not part of `npm run dev` or a production account setup. [Review account provisioning](scripts/provision-review.mjs) prepares SQL for an explicitly selected, isolated review database and does not apply it automatically.

```sh
npm run verify
npm run storybook
```

`verify` runs architecture checks, TypeScript, full lint, unit tests, isolated API integration tests, the Storybook build and the static Pages build. Storybook runs separately on port 6006. See the [component architecture guide](docs/COMPONENT-ARCHITECTURE.md).

Browser regressions cover [guest COD/product/tax flows](tests/guest-cod-browser.mjs), [owner and customer workflows](tests/review-browser.mjs), [language persistence](tests/language-browser.mjs) and [pending checkout tax notices](tests/checkout-tax-browser.mjs). These require a running local review instance, Chrome and a separately installed Playwright module; their environment variables and target guards are defined in each script. They are separate from `npm run verify`.

## Cloudflare deployment

`npm run build` generates static assets in `dist/client` and checks that the expected routes were exported. The API is provided by [Pages Functions](functions/api/[[path]].ts), with services in `server/` and schema/migrations in `db/` and `drizzle/`.

The dedicated review deployment uses [wrangler.review.json](wrangler.review.json), its own D1 database and R2 bucket. After building, `node scripts/prepare-review.mjs` stages the review assets, Functions and configuration in `.wrangler/review-release`; this command does not publish or change a database. Publishing that prepared directory to `sushi-hamburg-review` is an explicit maintainer action.

The older Cloudflare Pages project `sushi-hamburg` is Git-connected to this repository. Its configuration is [wrangler.pages.jsonc](wrangler.pages.jsonc); [wrangler.jobs.jsonc](wrangler.jobs.jsonc) describes its separate scheduled worker. The current class review uses the manual deployment described above. Database migrations, runtime secrets and scheduled-worker deployment are separate operations.

The checked-in [GitHub Actions workflow](.github/workflows/component-quality.yml) performs verification only; it has no deployment step. Cloudflare's Git integration is configured separately from GitHub Actions.

## Content and editing

- Supplied product data: `lib/catalog.ts` and `lib/product-translations.json`; prices use integer euro cents. Owner changes are stored in D1.
- Interface translations: `lib/shop-copy.ts`, commerce/operations copy and feature copy files under `components/`.
- Knowledge articles: `lib/knowledge-data.json`; builds regenerate `public/data/sushi-knowledge.json`. See [knowledge provenance](docs/sushi-knowledge.md).
- Supplied menu cards and web photographs: `public/menus/` and `public/photos/`. Full-resolution originals are excluded from Git and web deployment. See [content sources](docs/content-sources.md).

Before using the application for real service, the restaurant still needs to provide final operator/contact information and confirm complete ingredient, allergen and additive details. The public review instance is for testing.
