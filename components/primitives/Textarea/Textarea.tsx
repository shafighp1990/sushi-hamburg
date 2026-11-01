import { textareaStyles } from "./Textarea.styles";
import type { TextareaProps } from "./Textarea.types";
/** Native attributes, refs, browser validation and form submission pass through. */
export function Textarea({
  appearance = "inherit",
  className,
  ...props
}: TextareaProps) {
  return (
    <textarea
      {...props}
      className={
        appearance === "standard"
          ? [textareaStyles.standard, className].filter(Boolean).join(" ")
          : className
      }
    />
  );
}
