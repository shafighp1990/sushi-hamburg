import type { FieldMessageProps } from "./FieldMessage.types";
import { fieldMessageStyles } from "./FieldMessage.styles";
export function FieldMessage({
  tone = "info",
  className,
  children,
  role,
  ...props
}: FieldMessageProps) {
  if (
    children === null ||
    children === undefined ||
    children === "" ||
    children === false
  )
    return null;
  return (
    <p
      {...props}
      role={role ?? (tone === "error" ? "alert" : "status")}
      aria-atomic="true"
      className={className ?? fieldMessageStyles[tone]}
    >
      {children}
    </p>
  );
}
