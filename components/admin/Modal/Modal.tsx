"use client";
import { useEffect, useRef } from "react";
import { useShop } from "../../shop-context";
import { t } from "@/lib/shop-copy";
import { Heading } from "@/components/primitives/Heading";
import { Button } from "@/components/primitives/Button";
import { styles } from "./Modal.styles";
import type { ModalProps } from "../admin.types";

export function Modal({ title, close, children }: ModalProps) {
  const { lang } = useShop();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={ref} className={styles.dialog} onCancel={close}>
      <div className={styles.div}>
        <Heading as="h2">{title}</Heading>
        <Button type="button" onClick={close}>
          {t(lang, "cancel")}
        </Button>
      </div>
      {children}
    </dialog>
  );
}
