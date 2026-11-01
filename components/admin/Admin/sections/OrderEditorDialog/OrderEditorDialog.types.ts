import type { AdminViewProps } from "../../AdminView.types";
export type OrderEditorDialogProps = Pick<
  AdminViewProps,
  | "lang"
  | "setIncoming"
  | "orders"
  | "setOrders"
  | "status"
  | "error"
  | "busy"
  | "editingOrder"
  | "setEditingOrder"
  | "action"
>;
