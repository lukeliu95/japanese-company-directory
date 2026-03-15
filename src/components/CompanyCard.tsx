import Link from "next/link";
import type { Company } from "@/types";
import { INDUSTRY_BY_NAME } from "@/lib/slugs";

interface CompanyCardProps {
  company: Company;
}

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function industrySlugFor(name: string): string | null {
  return INDUSTRY_BY_NAME.get(name) ?? null;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex border-b border-slate-100 py-2.5">
      <dt className="w-28 shrink-0 text-sm text-slate-500 sm:w-36">
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{value || "\u2014"}</dd>
    </div>
  );
}

export default function CompanyCard({ company }: CompanyCardProps) {
  const industryTags = parseJsonArray(company.industry_tags);
  const features = parseJsonArray(company.features);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          {company.company_name ?? "\u2014"}
        </h1>
        {company.company_name_kana && (
          <p className="mt-0.5 text-sm text-slate-500">
            {company.company_name_kana}
          </p>
        )}
      </div>

      {/* Basic info */}
      <div className="px-5 py-4 sm:px-6">
        <dl>
          <InfoRow label="所在地" value={company.location ?? company.address} />
          <InfoRow label="設立" value={company.established_date} />
          <InfoRow label="資本金" value={company.capital} />
          <InfoRow label="売上高" value={company.revenue} />
          <InfoRow label="従業員数" value={company.employees} />
          <InfoRow label="代表者" value={company.representative_name} />
          <InfoRow label="法人番号" value={company.corporate_number} />
          {company.listing_market && (
            <InfoRow label="上場市場" value={company.listing_market} />
          )}
          {company.securities_code && (
            <InfoRow label="証券コード" value={company.securities_code} />
          )}
        </dl>
      </div>

      {/* Industry tags */}
      {industryTags.length > 0 && (
        <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            業種
          </h2>
          <div className="flex flex-wrap gap-2">
            {industryTags.map((tag) => {
              const slug = industrySlugFor(tag);
              if (slug) {
                return (
                  <Link
                    key={tag}
                    href={`/${slug}`}
                    className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    {tag}
                  </Link>
                );
              }
              return (
                <span
                  key={tag}
                  className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {tag}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Features */}
      {features.length > 0 && (
        <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            特徴
          </h2>
          <div className="flex flex-wrap gap-2">
            {features.map((feature) => (
              <span
                key={feature}
                className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Business summary */}
      {company.summary && (
        <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            事業概要
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            {company.summary}
          </p>
        </div>
      )}

      {/* Detailed description */}
      {company.description && (
        <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            会社概要
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {company.description}
          </p>
        </div>
      )}
    </div>
  );
}
