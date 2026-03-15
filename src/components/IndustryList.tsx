import Link from "next/link";

interface IndustryItem {
  slug: string;
  name_ja: string;
  company_count: number;
}

interface IndustryListProps {
  industries: IndustryItem[];
  prefectureSlug?: string;
}

export default function IndustryList({
  industries,
  prefectureSlug,
}: IndustryListProps) {
  if (industries.length === 0) {
    return (
      <p className="py-4 text-sm text-slate-500">
        業種データがありません。
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100" role="list">
      {industries.map((industry) => {
        const href = prefectureSlug
          ? `/${prefectureSlug}/${industry.slug}`
          : `/${industry.slug}`;

        return (
          <li key={industry.slug}>
            <Link
              href={href}
              className="flex items-center justify-between px-2 py-3 transition-colors hover:bg-slate-50"
            >
              <span className="text-sm text-slate-800">
                {industry.name_ja}
              </span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {industry.company_count.toLocaleString()}社
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
