# Sushi HH: catering storefront identity

Updated 2026-09-07 following the owner's request to remove the repeated image-plus-slogan opening.

The homepage is now a short restaurant introduction with a restrained, replaceable hero, a clear View the menu action, delivery information and a link to the sushi journal. The owner will supply the bespoke hero design later. The complete orderable menu, category tabs, prices, ingredients and basket live at /menu. Home and Menu are distinct navigation entries; the logo returns home, while product and checkout back links return to /menu. The warm light palette, original logo, photography and four languages remain in use.

## Typography

- Cormorant Garamond, variable 300–700, for Latin/Cyrillic titles: local Samples font 09.
- Golos Text, variable 400–900, for descriptions, forms, navigation and reading: https://github.com/googlefonts/golos-text

Both are self-hosted WOFF2 files in `public/fonts`, downloaded from the Google Fonts source collection, with their SIL OFL licenses included. No Google Fonts request is made by visitors. Font glyph maps were checked for German umlauts, ß, Ukrainian Ґ/Є/І/Ї and Cyrillic letters. The display font is approximately 205 KB in WOFF2. No claim is made that these fonts are exclusive to this restaurant.

## Supplied identity

The user's original 640×640 JPEG is retained byte-for-byte at `public/brand/sushi-hh-original.jpg`. The header and favicon SVGs only frame/embed those original pixels in a tighter viewport: no logo shapes, lettering or colors were redrawn or generated. The logo is used by the shared header, page metadata and default favicon. The light palette uses warm rice paper, sage green and terracotta, while the supplied logo retains its original colors. Apple touch icon uses the original image.

## Reference research

Reviewed actual navigation and ordering content from:

- Kura Sushi Japan: https://www.kurasushi.co.jp/ — menu, store/reservation and takeaway/order entry points.
- GO by Steffen Henssler ordering: https://hensslergo.simplywebshop.de/storedata/listStore — ordering begins with the store/fulfilment choice.
- Sushije: https://www.sushije.de/ — menu, collection/delivery and concrete food selections. This site also has a slogan; the research does not support claiming that all real restaurant sites avoid slogans.

The resulting layout is an original application of ordering priorities, not a copied design. Reference sites' prices, photos and operating details are not used for Sushi HH.

## Menu update

All four supplied menu posters are available from the homepage. The new Philadelphia/California/Dragon page adds 12 products for 40 total. Existing prices and delivery rules remain based on the owner's supplied information. Exact recipes/ambiguous printed wording require restaurant confirmation.

## Local sample refresh · 12 October 2026

Header 12, footer 44, button models 02/03/11/18 and service models 23/35 are adapted for the real catering store. See DESIGN-SOURCES.txt for precise sources, changes and legacy setting mappings. No stone materials or decorative directional arrows. Current-page navigation, mobile menu, photo selection, disabled actions and busy states share the same system.
