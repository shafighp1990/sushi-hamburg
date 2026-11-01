import type { AccountViewProps } from "../../AccountView.types";
export type AccountAccessFormProps = Pick<
  AccountViewProps,
  | "reset"
  | "reviewMode"
  | "lang"
  | "newsletter"
  | "setNewsletter"
  | "mode"
  | "setMode"
  | "error"
  | "setError"
  | "notice"
  | "setNotice"
  | "busy"
  | "form"
  | "set"
  | "auth"
>;
