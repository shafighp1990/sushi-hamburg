import { inputStyles } from "./Input.styles";
import type { InputProps } from "./Input.types";
/** Native attributes, refs, browser validation and form submission pass through. */
export function Input({
  appearance = "inherit",
  className,
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      className={
        appearance === "standard"
          ? [inputStyles.standard, className].filter(Boolean).join(" ")
          : className
      }
    />
  );
}
