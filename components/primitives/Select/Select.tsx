import { selectStyles } from "./Select.styles";
import type { SelectProps } from "./Select.types";
/** Native attributes, refs, browser validation and form submission pass through. */
export function Select({
  appearance = "inherit",
  className,
  ...props
}: SelectProps) {
  return (
    <select
      {...props}
      className={
        appearance === "standard"
          ? [selectStyles.standard, className].filter(Boolean).join(" ")
          : className
      }
    />
  );
}
