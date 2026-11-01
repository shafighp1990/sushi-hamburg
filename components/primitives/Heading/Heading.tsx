import { headingStyles } from "./Heading.styles";
import type { HeadingProps } from "./Heading.types";
export function Heading({
  as: Tag = "h2",
  appearance = "inherit",
  className,
  ...props
}: HeadingProps) {
  return (
    <Tag
      {...props}
      className={
        appearance === "standard"
          ? [headingStyles.standard, className].filter(Boolean).join(" ")
          : className
      }
    />
  );
}
