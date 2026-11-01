import type { ComponentPropsWithRef } from "react";
export type HeadingProps = ComponentPropsWithRef<"h1"> & {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
} & { appearance?: "inherit" | "standard" };
