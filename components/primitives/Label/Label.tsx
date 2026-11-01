import { labelStyles } from "./Label.styles";
import type { LabelProps } from "./Label.types";
/** Native attributes, refs, browser validation and form submission pass through. */
export function Label({
  appearance = "inherit",
  className,
  htmlFor,
  ...props
}: LabelProps) {
  return (
    <label
      {...props}
      htmlFor={htmlFor}
      className={
        appearance === "standard"
          ? [labelStyles.standard, className].filter(Boolean).join(" ")
          : className
      }
    />
  );
}
