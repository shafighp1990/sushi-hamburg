import { textStyles } from "./Text.styles";
import type { TextProps } from "./Text.types";
export function Text(props: TextProps) {
  if (props.as === "output") {
    const { as: Tag, appearance = "inherit", className, ...attributes } = props;
    return <Tag {...attributes} className={appearance === "standard" ? [textStyles.standard, className].filter(Boolean).join(" ") : className} />;
  }
  const { as: Tag = "p", appearance = "inherit", className, ...attributes } = props;
  return <Tag {...attributes} className={appearance === "standard" ? [textStyles.standard, className].filter(Boolean).join(" ") : className} />;
}
