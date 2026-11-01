import type { AdminViewProps } from "../../AdminView.types";
export type CustomerEditorDialogProps = Pick<
  AdminViewProps,
  | "lang"
  | "customers"
  | "error"
  | "busy"
  | "editingCustomer"
  | "setEditingCustomer"
  | "link"
  | "setLink"
  | "action"
>;
