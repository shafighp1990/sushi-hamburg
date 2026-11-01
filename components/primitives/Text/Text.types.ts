import type { ComponentPropsWithRef } from "react";
type Appearance = { appearance?: "inherit" | "standard" };
export type TextProps = Appearance & (
  | (ComponentPropsWithRef<"p"> & { as?: "p" | "span" | "strong" | "b" | "small" | "em" })
  | (ComponentPropsWithRef<"output"> & { as: "output" })
);
