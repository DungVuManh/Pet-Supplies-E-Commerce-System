import Image from "next/image";
import Link from "next/link";

type CategoryCardProps = {
  name: string;
  description: string;
  icon: string;
  href: string;
  active?: boolean;
};

export function CategoryCard({ name, description, icon, href, active }: CategoryCardProps) {
  return (
    <Link href={href} aria-current={active ? "true" : undefined} className={`flex min-h-20 min-w-0 items-center gap-3 rounded-xl border p-3 transition-colors hover:border-brand sm:gap-4 sm:p-4 ${active ? "border-brand bg-brand-subtle" : "border-line bg-surface"}`}>
      <Image src={icon} width={28} height={28} alt="" className="shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug">{name}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">{description}</p>
      </div>
    </Link>
  );
}
