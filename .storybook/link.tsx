import type { ComponentProps } from "react";
type Props = Omit<ComponentProps<"a">, "href"> & {
  href: string | { pathname?: string };
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};
export default function Link({
  href,
  prefetch,
  replace,
  scroll,
  children,
  ...props
}: Props) {
  void prefetch;
  void replace;
  void scroll;
  return (
    <a
      {...props}
      href={typeof href === "string" ? href : href.pathname}
      onClick={(event) => {
        event.preventDefault();
        props.onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
