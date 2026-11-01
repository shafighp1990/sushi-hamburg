import Link from "next/link";
import Image from "next/image";
export function Brand() {
  return (
    <Link
      className="brand restaurant-brand"
      href="/"
      aria-label="Sushi HH · Hamburg"
    >
      <Image unoptimized
        src="/brand/sushi-hh-logo.svg"
        width="114"
        height="87"
        alt="Sushi HH"
        fetchPriority="high"
      />
    </Link>
  );
}
