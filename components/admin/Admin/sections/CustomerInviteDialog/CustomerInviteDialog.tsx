"use client";
import { send } from "@/lib/shop-api";
import { t } from "@/lib/shop-copy";
import { Button } from "@/components/primitives/Button";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { Label } from "@/components/primitives/Label";
import { Input } from "@/components/primitives/Input";
import { styles } from "./CustomerInviteDialog.styles";
import { Modal } from "../../../Modal";
import type { CustomerInviteDialogProps } from "./CustomerInviteDialog.types";

export function CustomerInviteDialog({
  lang,
  error,
  busy,
  setInvite,
  setLink,
  action,
}: CustomerInviteDialogProps) {
  return (
    <Modal title={t(lang, "addCustomer")} close={() => setInvite(false)}>
      <form
        className={styles.form4}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void action(async () => {
            const r = await send<{ link: string }>("/admin/customers", {
              name: f.get("name"),
              email: f.get("email"),
            });
            setLink(r.link);
            setInvite(false);
          });
        }}
      >
        <Label>
          {t(lang, "name")}
          <Input name="name" required maxLength={120} />
        </Label>
        <Label>
          {t(lang, "email")}
          <Input name="email" type="email" required maxLength={254} />
        </Label>
        {error && (
          <FieldMessage
            tone="error"
            className={styles.fieldMessage8}
            role="alert"
          >
            {error}
          </FieldMessage>
        )}
        <Button className={styles.button14} disabled={busy} aria-busy={busy}>
          {t(lang, "addCustomer")}
        </Button>
      </form>
    </Modal>
  );
}
