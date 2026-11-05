"use client";

import Link from "next/link";
import { CommerceAdmin } from "../../commerce-admin";
import { productPhotos } from "../../product-gallery";
import { ct } from "@/lib/commerce-copy";

import {
  Plus,
  Search,
  ClipboardList,
  Users,
  Package,
  LayoutDashboard,
  X,
  Copy,
} from "lucide-react";
import { ShopShell } from "../../shop-shell";
import { ProductPhoto } from "../../product-photo";
import { send } from "@/lib/shop-api";
import { t, statusKey, type CopyKey } from "@/lib/shop-copy";
import { money, productText, productForDisplay } from "@/lib/catalog";
import { Heading } from "@/components/primitives/Heading";
import { Button } from "@/components/primitives/Button";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { Text } from "@/components/primitives/Text";
import { Label } from "@/components/primitives/Label";
import { Input } from "@/components/primitives/Input";
import { Select } from "@/components/primitives/Select";
import { Textarea } from "@/components/primitives/Textarea";
import { styles } from "./AdminView.styles";
import { emptyProduct } from "../admin.shared";
import { Modal } from "../Modal";
import { OrderCard } from "../OrderCard";
import type { AdminViewProps } from "./AdminView.types";
import { ProductEditorDialog } from "./sections/ProductEditorDialog";
import { OrderEditorDialog } from "./sections/OrderEditorDialog";
import { CustomerEditorDialog } from "./sections/CustomerEditorDialog";
import { CustomerInviteDialog } from "./sections/CustomerInviteDialog";

export function AdminView({
  lang,
  user,
  loading,
  refreshUser,
  incoming,
  setIncoming,
  tab,
  setTab,
  stats,
  orders,
  setOrders,
  products,
  customers,
  query,
  setQuery,
  status,
  setStatus,
  error,
  setError,
  notice,
  setNotice,
  busy,
  editingProduct,
  setEditingProduct,
  editingOrder,
  setEditingOrder,
  editingCustomer,
  setEditingCustomer,
  invite,
  setInvite,
  link,
  setLink,
  productLang,
  setProductLang,
  uploadReady,
  load,
  connected,
  action,
}: AdminViewProps) {
  if (loading)
    return (
      <ShopShell>
        <FieldMessage className={styles.fieldMessage} >
          {t(lang, "loading")}
        </FieldMessage>
      </ShopShell>
    );
  if (!user)
    return (
      <ShopShell>
        <div className={styles.div2}>
          <Heading as="h1">{t(lang, "admin")}</Heading>
          <Link className={styles.a} href="/admin/login">
            {t(lang, "signIn")}
          </Link>
        </div>
      </ShopShell>
    );
  if (!user.admin)
    return (
      <ShopShell>
        <div className={styles.div3}>
          <Heading as="h1">{t(lang, "admin")}</Heading>
          <Text>{t(lang, "adminDenied")}</Text>
          <Link href="/account">{t(lang, "account")}</Link>
        </div>
      </ShopShell>
    );
  const q = query.toLocaleLowerCase();
  const filteredOrders = orders.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      `${o.id} ${o.customer.name} ${o.customer.phone} ${o.customer.email}`
        .toLocaleLowerCase()
        .includes(q),
  );
  return (
    <ShopShell wide>
      <div className={styles.div4}>
        <div>
          <Text as="span" className={styles.text}>
            CATERING / HH
          </Text>
          <Heading as="h1">{t(lang, "admin")}</Heading>
        </div>
        <div className={styles.div5}>
          <Link className={styles.a2} href="/menu">
            {t(lang, "menu")}
          </Link>
          <Button
            className={styles.button}
            onClick={async () => {
              await send("/auth/sign-out", {});
              await refreshUser();
              location.replace("/admin/login");
            }}
          >
            {t(lang, "signOut")}
          </Button>
          <Button className={styles.button2} onClick={load}>
            {t(lang, "refresh")}
          </Button>
        </div>
      </div>
      <FieldMessage className={styles.fieldMessage2} >
        <i className={connected ? "connected" : ""} />
        {ct(lang, connected ? "liveOrders" : "reconnecting")}
      </FieldMessage>
      {incoming.length > 0 && (
        <div className={styles.div6} role="alert">
          {incoming.map((o) => (
            <Button
              key={o.id}
              onClick={() => {
                setEditingOrder({ ...o });
                setIncoming((rows) => rows.filter((r) => r.id !== o.id));
              }}
            >
              {ct(lang, o.paid ? "newPaidOrder" : "newDeliveryOrder")} · #
              {o.id.slice(0, 8).toUpperCase()} · {o.customer.name}
            </Button>
          ))}
          <Button
            aria-label={t(lang, "cancel")}
            onClick={() => setIncoming([])}
          >
            <X size={16} />
          </Button>
        </div>
      )}
      <div className={styles.div7}>
        {([
          ["overview", LayoutDashboard],
          ["orders", ClipboardList],
          ["products", Package],
          ["customers", Users],
        ] as const).map(([key, Icon]) => (
          <Button
            key={key}
            aria-pressed={tab === key}
            onClick={() => {
              setTab(key);
              setQuery("");
            }}
          >
            <Icon size={18} />
            {t(lang, key)}
          </Button>
        ))}
        <Button
          aria-pressed={tab === "commerce"}
          onClick={() => setTab("commerce")}
        >
          {ct(lang, "offers")} / {ct(lang, "settings")}
        </Button>
      </div>
      {error && (
        <FieldMessage
          tone="error"
          className={styles.fieldMessage3}
          role="alert"
        >
          {error}
        </FieldMessage>
      )}
      {notice && (
        <FieldMessage className={styles.fieldMessage4} >
          {notice}
        </FieldMessage>
      )}
      {tab === "commerce" ? (
        <CommerceAdmin customers={customers} />
      ) : tab === "overview" ? (
        <>
          <div className={styles.div8}>
            <Button onClick={() => setTab("orders")}>
              <Text as="span">{t(lang, "orders")}</Text>
              <Text as="strong">{stats.orders || 0}</Text>
            </Button>
            <Button
              onClick={() => {
                setTab("orders");
                setStatus("new");
              }}
            >
              <Text as="span">{t(lang, "pendingOrders")}</Text>
              <Text as="strong">{stats.pending || 0}</Text>
            </Button>
            <div>
              <Text as="span">{t(lang, "revenue")}</Text>
              <Text as="strong">{money(stats.revenue || 0)}</Text>
            </div>
            <Button onClick={() => setTab("customers")}>
              <Text as="span">{t(lang, "customers")}</Text>
              <Text as="strong">{customers.length}</Text>
            </Button>
          </div>
          <Heading as="h2">{t(lang, "pendingOrders")}</Heading>
          <div className={styles.div9}>
            {orders
              .filter((o) => !["cancelled", "delivered"].includes(o.status))
              .slice(0, 12)
              .map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onClick={() => setEditingOrder({ ...o })}
                />
              ))}
          </div>
        </>
      ) : (
        <>
          <div className={styles.div10}>
            <Label className={styles.label}>
              <Search size={17} />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(lang, tab as CopyKey)}
                aria-label={t(lang, "search")}
              />
            </Label>
            {tab === "orders" && (
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label={t(lang, "status")}
              >
                {[
                  "all",
                  "new",
                  "confirmed",
                  "preparing",
                  "out_for_delivery",
                  "delivered",
                  "cancelled",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? t(lang, "all") : t(lang, statusKey(s))}
                  </option>
                ))}
              </Select>
            )}
            {tab === "products" && (
              <Button
                className={styles.button3}
                onClick={() => {
                  setEditingProduct(emptyProduct());
                  setProductLang("de");
                }}
              >
                <Plus size={17} />
                {t(lang, "addProduct")}
              </Button>
            )}
            {tab === "customers" && (
              <Button
                className={styles.button4}
                onClick={() => setInvite(true)}
              >
                <Plus size={17} />
                {t(lang, "addCustomer")}
              </Button>
            )}
          </div>
          {tab === "orders" && (
            <div className={styles.div11}>
              {filteredOrders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onClick={() => setEditingOrder({ ...o })}
                />
              ))}
            </div>
          )}
          {tab === "products" && (
            <div className={styles.div12}>
              {products
                .filter((p) =>
                  `${p.id} ${productText(p, lang).name}`.toLocaleLowerCase().includes(q),
                )
                .map((p) => (
                  <div
                    key={p.id}
                    className={p.active === false ? "inactive" : ""}
                  >
                    <ProductPhoto product={productForDisplay(p)} lang={lang} />
                    <Text as="span">
                      <Text as="b">{productText(p, lang).name}</Text>
                      <Text as="small">
                        {t(lang, p.category)} · {p.active === false ? "○" : "●"}
                      </Text>
                    </Text>
                    <Text as="strong">{money(p.price)}</Text>
                    <Button
                      className={styles.button5}
                      onClick={() =>
                        setEditingProduct({
                          ...JSON.parse(JSON.stringify(p)),
                          images: productPhotos(p),
                        })
                      }
                    >
                      {t(lang, "edit")}
                    </Button>
                  </div>
                ))}
            </div>
          )}
          {tab === "customers" && (
            <>
              <Text className={styles.text2}>{t(lang, "noPassword")}</Text>
              <div className={styles.div13}>
                {customers
                  .filter((c) =>
                    `${c.name} ${c.email} ${c.phone || ""}`
                      .toLocaleLowerCase()
                      .includes(q),
                  )
                  .map((c) => (
                    <div key={c.id}>
                      <Text as="span" className={styles.text3}>
                        {c.name.slice(0, 1).toUpperCase()}
                      </Text>
                      <Text as="span">
                        <Text as="b">
                          {c.name} {c.disabled ? "○" : ""}
                        </Text>
                        <Text as="small" dir="ltr">
                          {c.email}
                        </Text>
                        <Text as="small">{c.phone}</Text>
                      </Text>
                      <Text as="span">
                        {c.orders} {t(lang, "orders")}
                      </Text>
                      <Button
                        className={styles.button6}
                        onClick={() => setEditingCustomer({ ...c })}
                      >
                        {t(lang, "edit")}
                      </Button>
                    </div>
                  ))}
              </div>
            </>
          )}
        </>
      )}
      {editingProduct && (
        <ProductEditorDialog
          lang={lang}
          loading={loading}
          products={products}
          error={error}
          busy={busy}
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
          productLang={productLang}
          setProductLang={setProductLang}
          uploadReady={uploadReady}
          action={action}
        />
      )}
      {editingOrder && (
        <OrderEditorDialog
          lang={lang}
          setIncoming={setIncoming}
          orders={orders}
          setOrders={setOrders}
          status={status}
          error={error}
          busy={busy}
          editingOrder={editingOrder}
          setEditingOrder={setEditingOrder}
          action={action}
        />
      )}
      {editingCustomer && (
        <CustomerEditorDialog
          lang={lang}
          customers={customers}
          error={error}
          busy={busy}
          editingCustomer={editingCustomer}
          setEditingCustomer={setEditingCustomer}
          link={link}
          setLink={setLink}
          action={action}
        />
      )}
      {invite && (
        <CustomerInviteDialog
          lang={lang}
          customers={customers}
          error={error}
          busy={busy}
          setInvite={setInvite}
          link={link}
          setLink={setLink}
          action={action}
        />
      )}
      {link && (
        <Modal title={t(lang, "resetLink")} close={() => setLink("")}>
          <Text>{t(lang, "resetLinkNote")}</Text>
          <Textarea
            readOnly
            rows={5}
            value={link}
            className={styles.textarea}
            dir="ltr"
          />
          <Button
            className={styles.button15}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setNotice("copied");
              } catch {
                setError("SERVER_ERROR");
              }
            }}
          >
            <Copy size={16} />
            {t(lang, "resetLink")}
          </Button>
        </Modal>
      )}
    </ShopShell>
  );
}
