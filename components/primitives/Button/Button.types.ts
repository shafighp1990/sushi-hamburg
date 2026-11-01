import type { ComponentPropsWithRef } from "react";
export type ButtonProps = ComponentPropsWithRef<"button"> & {
  busy?: boolean;
} & { appearance?: "inherit" | "standard" };
