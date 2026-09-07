# Sushi Hamburg

German and Ukrainian restaurant website, built with React, TypeScript, Vinext and the Sites scaffold. Includes the complete 28-item supplied menu, responsive product categories, a device-local cart and an explicit Telegram order-request handoff.

## Local development

Node.js 22.13+ is required.

```
npm ci
npm run dev
npm run check
npm run build
```

Static production output: `dist/client`. Cloudflare Pages should run `npm run build` with this output directory and deploy pushes to `main`.

## Restaurant content

- Menu and prices: `lib/catalog.ts`, amounts stored in integer euro cents.
- German/Ukrainian customer copy and order UI: `app/page.tsx`.
- Appearance: `app/globals.css`.
- Supplied original menu cards: `public/menus/`.
- All 120 gallery photographs, web versions: `public/photos/`.
- All 120 full-resolution photographs: `assets/originals/` on the external project drive, intentionally excluded from Git and web deployment. Total original photo size: 1,115,070,712 bytes.
- Download verification and original source endpoints: `assets/download-manifest.json`.

Project drive: `/Volumes/projects/sushi-hamburg`.

## Order flow

1. Select dishes and quantities; the cart persists only in this browser.
2. Enter delivery information and choose a Thursday–Sunday date.
3. Same-day requests close at 13:00 Europe/Berlin. Requested delivery time must be no later than 21:00.
4. Zone A adds €6; B adds €9. C/D/E display €0.70/km with a pending quote. Unknown zones also require a quote. Never infer a distance from an address.
5. Review the exact request. The customer opens Telegram and sends it themselves. Copy-to-clipboard is available as a fallback.

No message is sent automatically. No order is described as accepted or paid. Availability, final delivery charges and payment method require restaurant confirmation. Customer contact details are not saved in localStorage, a database or logs by the application.

## Inputs still needed from the restaurant

- Confirm official business/operator name, full public address and contact details for complete provider and privacy information.
- Confirm full recipes/allergen/additive details, especially the two set descriptions truncated in the supplied cards.
- Confirm payment method; online card processing is not configured. To add actual online payment, provide the payment provider account integration and an order-confirmation destination.
- Confirm permanent opening/delivery start times if a narrower requested-time window is needed. No unprovided start time has been invented.

The later Thursday–Sunday announcement takes precedence over the older Friday–Sunday notice. The undated “today until 14:00” message is treated as a one-day exception, not a permanent cutoff.

## Validation

`npm run check` and `npm run build` pass. Business-logic checks cover catalog uniqueness, integer-cent totals, invalid cart data, delivery fees, operating days, Berlin daylight-saving conversion, the 13:00 cutoff and the 21:00 delivery limit. All 120 original JPEGs and web JPEGs were downloaded and decoded.

Feature-detected WebMCP tools expose menu/cart reads and validated cart quantity changes. They never send orders or take payment. No compatible WebMCP validation context was available; these optional agent tools have not been runtime-verified. Browser interaction testing was not requested.
