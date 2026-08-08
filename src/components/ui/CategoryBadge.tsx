import Link from "next/link";

interface Props {
  name: string;
  slug: string;
  size?: "sm" | "md";
}

export default function CategoryBadge({ name, slug, size = "md" }: Props) {
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";
  return (
    <Link href={`/kategori/${slug}`}>
      <span className={`inline-block bg-primary-600 text-white font-semibold rounded-full uppercase tracking-wide hover:bg-primary-700 transition-colors ${sizeClass}`}>
        {name}
      </span>
    </Link>
  );
}
