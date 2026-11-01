import type { ComponentPropsWithRef } from "react";
export type SelectProps = ComponentPropsWithRef<"select"> & {
  appearance?: "inherit" | "standard";
};
