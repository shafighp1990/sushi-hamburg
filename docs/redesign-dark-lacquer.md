# Redesign „Dark Lacquer“ · November 2026 (Branch `redesign/dark-lacquer`)

Visueller Neuanfang bei unveränderter Funktion: Warenkorb, Gast-Checkout, Zahlungsarten (Barzahlung,
Stripe/PayPal/Revolut/SumUp nach Kontoverbindung), Gutscheine, Lieferzonen, Tracking-Links, Kundenkonten,
Admin-Desk, D1/R2, Pages Functions und Übersetzungen (DE/UK/EN/FA, RTL) sind identisch zu `main`.

## Was sich geändert hat

- `app/redesign.css` ist die einzige neue Stilschicht und wird zuletzt geladen. Sie definiert die Farb-Tokens
  neu (Lack-Schwarz `#0d0c0a`, Bone `#f4ede0`, Lachs `#e35a3c` aus dem Logo, Gold-Haarlinien `#c9a66b`,
  Wasabi `#9fb58b`) und brückt sie auf die alten Variablennamen (`--paper`, `--ink`, `--accent`, …), damit auch
  Admin, Konto, Tracking, Journal und Galerie automatisch das neue Erscheinungsbild erhalten.
- `app/samples.css` und `app/polish.css` (Sample-Header 12 / Footer 44) wurden entfernt; `app/shop.css`
  bleibt als Basis für Layout-Regeln bestehen und wird gezielt überschrieben.
- Neues Markup: `ShopHeader` (sticky, Statusleiste + zentrierte Navigation + Konto/Warenkorb),
  `ShopFooter` (Wortmarke, Lieferzeiten-Board, Links, Rechtsleiste), `HomeHero` (Großtitel, Studio-Foto mit
  Bildunterschrift). Alle anderen Komponenten behalten ihr Markup; nur die Klassen werden neu gestaltet.
- Produktkarten: Foto bleibt unbeschnitten (`object-fit: contain`) auf fast schwarzem Grund, dadurch
  verschmelzen die Schiefer-Studiofotos mit der Fläche. Pillen-Buttons, Kategorie-Leiste sticky.
- Vom Betreiber wählbare Button-Stile (`data-button-style` outline/rounded/ticket) funktionieren weiterhin.
- Schriften unverändert: Cormorant Garamond (Titel), Golos Text (Lesetext), Estedad (Persisch).

## Prüfen

`npm run check`, `node scripts/check-components.cjs` und `npm test` (114 Tests, Render-Snapshots in
`tests/rendering.snapshots.json` aktualisiert) laufen durch. `npm run lint` und `npm run build` bitte lokal auf
dem Mac ausführen (die nativen Binaries von oxlint/rolldown liegen nur für macOS im `node_modules`).
Browser-Tests referenzieren jetzt `.site-nav` statt `.sample-nav`.
