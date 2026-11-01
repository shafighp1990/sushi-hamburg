"use client";
import { send } from "@/lib/shop-api";
import { t } from "@/lib/shop-copy";
import { Button } from "@/components/primitives/Button";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { Text } from "@/components/primitives/Text";
import { Label } from "@/components/primitives/Label";
import { Input } from "@/components/primitives/Input";
import { styles } from "./CustomerEditorDialog.styles";
import { Modal } from "../../../Modal";
import type { CustomerEditorDialogProps } from "./CustomerEditorDialog.types";

export function CustomerEditorDialog({
  lang,
  error,
  busy,
  editingCustomer,
  setEditingCustomer,
  setLink,
  action,
}: CustomerEditorDialogProps) {
  if (!editingCustomer) return null;
  return (
    <Modal title={editingCustomer.name} close={() => setEditingCustomer(null)}>
      <form
        className={styles.form3}
        onSubmit={(e) => {
          e.preventDefault();
          void action(async () => {
            await send(
              "/admin/customers/" + editingCustomer.id,
              { ...editingCustomer, action: "edit" },
              "PATCH",
            );
            setEditingCustomer(null);
          });
        }}
      >
        {(["name", "phone", "address"] as const).map((k) => (
          <Label key={k}>
            {t(lang, k)}
            <Input
              required={k === "name"}
              value={editingCustomer[k] || ""}
              onChange={(e) =>
                setEditingCustomer((c) => c ? ({ ...c, [k]: e.target.value }) : c)
              }
            />
          </Label>
        ))}
        <Text dir="ltr">{editingCustomer.email}</Text>
        <Button className={styles.button10} disabled={busy} aria-busy={busy}>
          {t(lang, "save")}
        </Button>
        <Button
          className={styles.button11}
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={() =>
            void action(async () => {
              const r = await send<{ link: string }>(
                "/admin/customers/" + editingCustomer.id,
                { action: "reset" },
                "PATCH",
              );
              setLink(r.link);
              setEditingCustomer(null);
            })
          }
        >
          {t(lang, "resetLink")}
        </Button>
        <Button
          className={styles.button12}
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={() =>
            void action(async () => {
              await send(
                "/admin/customers/" + editingCustomer.id,
                { action: editingCustomer.disabled ? "enable" : "disable" },
                "PATCH",
              );
              setEditingCustomer(null);
            })
          }
        >
          {t(lang, editingCustomer.disabled ? "enable" : "disable")}
        </Button>
        <details>
          <summary>{t(lang, "deleteCustomer")}</summary>
          <Text>{t(lang, "deleteConfirm")}</Text>
          <Input
            type="email"
            aria-label={t(lang, "email")}
            value={editingCustomer.confirmEmail || ""}
            onChange={(e) =>
              setEditingCustomer((c) => c ? ({ ...c, confirmEmail: e.target.value }) : c)
            }
          />
          <Button
            type="button"
            className={styles.button13}
            disabled={
              busy || editingCustomer.confirmEmail !== editingCustomer.email
            }
            onClick={() =>
              void action(async () => {
                await send(
                  "/admin/customers/" + editingCustomer.id,
                  { confirmEmail: editingCustomer.confirmEmail },
                  "DELETE",
                );
                setEditingCustomer(null);
              })
            }
          >
            {t(lang, "deleteCustomer")}
          </Button>
        </details>
        {error && (
          <FieldMessage
            tone="error"
            className={styles.fieldMessage7}
            role="alert"
          >
            {error}
          </FieldMessage>
        )}
      </form>
    </Modal>
  );
}
