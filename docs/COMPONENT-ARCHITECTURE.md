# Component architecture

Reference: [ReDI-School/F26-Full-Stack-Circle](https://github.com/ReDI-School/F26-Full-Stack-Circle/tree/03daede2a4d77734eaf466aedfd4ef53e8c4b570), inspected 2026-10-24. The reference itself includes unfinished components; its organization is the model, not a claim that every reference feature is complete.

## Ownership and layers

- `app/` owns routes and server composition.
- `components/primitives/<Name>/` owns reusable semantic controls, text, headings, labels, field feedback and toast presentation. Native attributes, refs, validation and form submission are preserved. Default appearance inherits the product's existing styling; `appearance="standard"` opts into a neutral reusable style.
- Every application feature has a folder under `components/`. Existing top-level `.tsx` files are compatibility exports, so existing imports keep working.
- `<Name>.tsx` composes the feature. `<Name>.types.ts` defines meaningful props. `<Name>.styles.ts` owns its static class names. Components without inputs do not need an empty props interface.
- Larger features use `use<Name>` for state, effects and server communication, `<Name>View` for rendering, and `sections/<Name>/` for forms, dialogs and tables.
- Internal views take typed inputs inferred from their controller. They do not open a second connection or duplicate state. Keep API calls out of extracted visual sections when introducing new behavior.
- Existing business services, API handlers, storage/authentication rules and database migrations retain their responsibilities. This is a component architecture refactor, not a backend-provider migration.
- Existing translations and product data stay in `lib/`; UI components receive translated text or use the existing locale provider. Do not place secrets or live customer data in stories.

## Adding a component

Create implementation, public props, styles and `index.ts` beside each other. Add a `.stories.tsx` for reusable components and representative states. Feature-private sections can be exercised through their feature story; add focused stories when they have independent interaction states. Prefer named intent such as `ProductEditorDialog` over a generic numbered panel.

Use the smallest semantic component that owns real behavior. Keep layout containers inside their owning view. Do not replace native links, dialogs, table semantics, labels or input behavior with clickable divs. Style classes continue to target the same rendered HTML.

## Component library

`npm run storybook` opens the local component library at port 6006. Use a different port for a second project: `npm run storybook -- --port 6007`.

`npm run build-storybook` creates `storybook-static/`. The library has language controls and examples for application features and primitive default, disabled, busy, error and success states. `beforeAll` substitutes local preview API responses; unsupported actions fail explicitly instead of reaching a live server. Router mocks do not navigate away from the library. Storybook is a development artifact and is not automatically published with the website.

## Verification

`npm run verify` checks architecture, TypeScript, tests, the component-library build and the application production build. The architecture check prevents native controls and text blocks being reintroduced throughout feature files. Low-level primitives and the existing vendor UI library are the intentional implementation boundary.

Component tests cover native form semantics, disabled/busy behavior, field/error association, semantic headings, escaped text, textarea attributes and live feedback. Application behavior tests remain alongside these tests. Manual browser checks remain necessary for camera/microphone permission, focus management, responsive layout and real payment-provider flows.

## Scope of the refactor

Compatibility exports preserve caller imports. No migration, payment-provider setting, authentication rule or live database is changed by this work. Existing unfinished work in the original checkout is preserved. Passing local checks is not a security audit or proof of all possible production interactions.

## Quality status (2026-10-24)

The application and Storybook production builds succeeded, and the complete 78-test suite passed. The original checkout also passed architecture and TypeScript checks. Browser smoke checks covered product search, basket updates and opening the product editor, with no console errors. Live payments were not exercised.

The full repository Oxlint run is **not clean**: it reports 332 diagnostics across migrated legacy features, existing services, vendor UI and earlier tests. Categories include existing broad `any` types, promise handling, React compiler recommendations and accessibility rules. The new primitives, Storybook support and component/rendering tests have no diagnostics in that run. `verify` currently enforces architecture, TypeScript, tests and builds; it does not imply that whole-repository lint passes. Do not describe this refactor as a completed production/security audit.
