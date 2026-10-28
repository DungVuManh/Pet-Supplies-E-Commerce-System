import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
};

export function Logo({
  href = "/",
  size = "md",
  className = "",
  priority = false,
}: LogoProps) {
  const dimensions = {
    sm: { width: 96, height: 32, className: "h-7 sm:h-8" },
    md: { width: 132, height: 44, className: "h-9 sm:h-10" },
    lg: { width: 162, height: 54, className: "h-11 sm:h-12" },
  }[size];

  const content = (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src="/icons/petjoy-logo.png"
        alt="Petjoy"
        width={dimensions.width}
        height={dimensions.height}
        priority={priority}
        className={`${dimensions.className} w-auto object-contain`}
      />
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      aria-label="Petjoy — Trang chủ"
      className="inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg transition-opacity hover:opacity-95"
    >
      {content}
    </Link>
  );
}
