import type { AdminViewProps } from "../../AdminView.types";
export type ProductEditorDialogProps = Pick<
  AdminViewProps,
  | "lang"
  | "loading"
  | "products"
  | "error"
  | "busy"
  | "editingProduct"
  | "setEditingProduct"
  | "productLang"
  | "setProductLang"
  | "uploadReady"
  | "action"
>;
