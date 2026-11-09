import type { Preview } from "@storybook/react-vite";
import { useEffect } from "react";
import { ShopProvider, useShop } from "../components/shop-context";
import { products, type Language } from "../lib/catalog";
import { defaultSettings } from "../lib/commerce";
import "../app/globals.css";
import "../app/shop.css";
import "../app/redesign.css";
function LanguagePreview({
  locale,
  children,
}: {
  locale: Language;
  children: React.ReactNode;
}) {
  const { setLang } = useShop();
  useEffect(() => {
    setLang(locale);
  }, [locale, setLang]);
  return <>{children}</>;
}
const preview: Preview = {
  globalTypes: {
    locale: { toolbar: { title: "Language", items: ["de", "en", "fa", "uk"] } },
  },
  initialGlobals: { locale: "de" },
  decorators: [
    (Story, context) => (
      <ShopProvider>
        <LanguagePreview locale={context.globals.locale as Language}>
          <Story />
        </LanguagePreview>
      </ShopProvider>
    ),
  ],
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  beforeAll() {
    const original = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const pathname = new URL(url, "https://preview.invalid").pathname;
      const responses: Record<string, unknown> = {
        "/api/products": { products },
        "/api/status": { ready: true, upload: false },
        "/api/settings": { settings: defaultSettings },
        "/api/me": {
          user: {
            id: "preview-user",
            name: "Preview customer",
            email: "preview@example.invalid",
            phone: "",
            address: "",
            postcode: "20095",
            city: "Hamburg",
            language: "de",
            admin: true,
          },
        },
        "/api/admin/overview": { orders: 0, revenue: 0, customers: 0 },
        "/api/admin/orders": { orders: [] },
        "/api/admin/products": { products },
        "/api/admin/customers": { customers: [] },
        "/api/admin/coupons": { coupons: [] },
        "/api/admin/connections": { connections: [] },
        "/api/admin/newsletter": { campaigns: [], stats: {} },
      };
      if (Object.prototype.hasOwnProperty.call(responses, pathname))
        return Response.json(responses[pathname]);
      return Response.json(
        {
          code: "PREVIEW_ONLY",
          error: "Preview only: this action has no live server.",
        },
        { status: 503 },
      );
    };
    return () => {
      globalThis.fetch = original;
    };
  },
};
export default preview;
