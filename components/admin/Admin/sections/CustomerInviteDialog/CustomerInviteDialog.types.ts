import type { AdminViewProps } from "../../AdminView.types";
export type CustomerInviteDialogProps = Pick<
  AdminViewProps,
  | "lang"
  | "customers"
  | "error"
  | "busy"
  | "setInvite"
  | "link"
  | "setLink"
  | "action"
>;
