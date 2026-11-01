import type { ReactNode } from "react";
import type { InputProps } from "../Input";
export type TextFieldProps = InputProps & {
  label: ReactNode;
  helperText?: string;
  error?: string;
  wrapperClassName?: string;
};
