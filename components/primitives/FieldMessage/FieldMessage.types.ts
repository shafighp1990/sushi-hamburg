import type { ComponentPropsWithRef } from "react";
export type FieldMessageProps = ComponentPropsWithRef<"p"> & {
  tone?: "error" | "success" | "info";
};
