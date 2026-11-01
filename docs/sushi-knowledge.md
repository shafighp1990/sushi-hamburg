# Sushi knowledge collection

Reviewed: 2026-09-07. Languages: German and Ukrainian.

## Scope and provenance

46 bilingual articles: 13 styles (including the explicit sashimi comparison), 24 ingredient entries, 6 preparation guides, and 3 history articles. Sources are linked on each article. The structured canonical record is `lib/knowledge-data.json`; `npm run build` synchronizes the downloadable `public/data/sushi-knowledge.json`. Edit only the canonical record. No external database or paid service is required.

The research prioritizes Japan's MAFF, Japan Tourism Agency, JNTO, the Japanese embassy in Singapore, Japanese food companies' primary cooking and ingredient material, and Hong Kong's Centre for Food Safety. Manufacturer material is used for definitions and culinary methods, not unverified health claims. Text is paraphrased in both languages, with brief source-specific summaries. Source references do not imply a supplier relationship with the restaurant. Origins are qualified where the sources describe broad Asian traditions rather than a single invention location. This is a broad curated collection, not an exhaustive inventory of every regional sushi recipe.

## Product integration

All 40 menu items have static `/menu/{id}` pages with the original menu description, price, menu photograph crop, links to ingredient explanations, related style/method articles, an original-menu link, and cart addition. Each article has a static `/wissen/{slug}` route. `/wissen` searches both languages and filters categories. The home menu links every image, title and details label to its product page; the journal is accessible from the header, hero and dedicated section.

Ingredient mappings use only the provided menu text. Restaurant trade names do not establish standard sushi styles or fish species. Bonito Roll contains salmon and fried onion per the source card; it is not relabeled as bonito fish. Snow crab is not silently relabeled as surimi. Sets have incomplete ingredient information and only cautious links to matching separately listed rolls. No nutritional values, unverified raw/cooked claims, species, sourcing, complete allergen declarations or restaurant recipes are fabricated. Preparation guides are educational general methods, not proprietary restaurant recipes. The source menu remains authoritative for these supplied product descriptions, subject to restaurant confirmation.

Cart additions from product pages use the same sanitized device-local basket and 50-item limit as /menu. Full page navigation preserves the saved basket; /checkout opens checkout. No customer message is sent by this change, and no payment is collected.

## Verification

- Seven Node regression tests cover bilingual search and filters, source/relationship integrity, evidence-based product mappings, related-product boundaries, cart compatibility and downloadable data synchronization.
- TypeScript and production static export checks.
- All exported article/product routes, unique page titles, single main headings, and local href/src targets checked from generated HTML.
- Global lint also includes pre-existing scaffold/UI diagnostics (generated components, existing home React-compiler and framework rules). Do not confuse those with successful type/build checks. New journal components are checked separately.
- No interactive browser/visual testing performed in this update.

Existing GitHub to Cloudflare Pages deployment on main remains the publishing route. The owner-only Sites copy is updated from the same source.

The fourth menu card supplied on 2026-09-07 adds 12 Philadelphia, California and Dragon products. California with salmon is transcribed at the printed €5 (230g); the original Red Dragon line says “сир тобіко”, which is preserved and flagged for clarification. Tobiko and lettuce glossary coverage and matching set-roll links were updated.
