import { buttonStyles } from "./Button.styles";
import type { ButtonProps } from "./Button.types";
/** Keeps the native submit default. Use type="button" for non-submit actions. */
export function Button({
  busy = false,
  disabled,
  children,
  appearance = "inherit",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={
        appearance === "standard"
          ? [buttonStyles.standard, className].filter(Boolean).join(" ")
          : className
      }
      disabled={disabled || busy}
      aria-busy={busy || props["aria-busy"]}
    >
      {children}
    </button>
  );
}
