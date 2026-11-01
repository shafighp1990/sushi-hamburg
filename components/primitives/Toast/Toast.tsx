import { FieldMessage } from "../FieldMessage";
import { toastStyles } from "./Toast.styles";
import type { ToastProps } from "./Toast.types";
/** Presentation only: the owning feature decides lifetime and placement. */
export function Toast({ className, ...props }: ToastProps) {
  return <FieldMessage {...props} className={className ?? toastStyles.root} />;
}
