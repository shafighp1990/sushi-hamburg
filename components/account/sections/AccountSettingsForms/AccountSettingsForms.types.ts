import type { AccountViewProps } from "../../AccountView.types";
export type AccountSettingsFormsProps = Pick<
  AccountViewProps,
  | "lang"
  | "reviewMode"
  | "user"
  | "refreshUser"
  | "setNotice"
  | "busy"
  | "form"
  | "setForm"
  | "set"
  | "action"
  | "auth"
>;
