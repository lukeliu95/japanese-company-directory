import Link from "next/link";
import JsonLd from "./JsonLd";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://japanese-company-directory.vercel.app';
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: item.href.startsWith('http') ? item.href : `${siteUrl}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <JsonLd data={jsonLdData} />
      <nav aria-label="パンくずリスト" className="py-3">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={index} className="flex items-center gap-1">
                {index > 0 && (
                  <span className="text-slate-300" aria-hidden="true">
                    &gt;
                  </span>
                )}
                {isLast || !item.href ? (
                  <span
                    className="text-slate-700"
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
