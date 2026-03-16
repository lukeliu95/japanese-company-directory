import Link from "next/link";
import type { CompanyListItem } from "@/types";

interface CompanyTableProps {
  companies: CompanyListItem[];
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

function extractYear(dateStr: string | null): string {
  if (!dateStr) return "—";
  const match = dateStr.match(/(\d{4})/);
  return match ? `${match[1]}年` : "—";
}

function shortenTag(tag: string): string {
  return tag.replace("業界の会社", "").replace("の会社", "");
}

/** 上場区分バッジ — 未上場は出さない（ノイズになる） */
function ListingBadge({ status }: { status: string | null }) {
  if (!status || status === "未上場") return null;
  const isListed = status.includes("上場") || status.includes("市場");
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
        isListed
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-gray-100 text-gray-600 border border-gray-200"
      }`}
    >
      {status}
    </span>
  );
}

export default function CompanyTable({ companies }: CompanyTableProps) {
  if (companies.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        該当する会社が見つかりませんでした。
      </p>
    );
  }

  return (
    <>
      {/* Desktop table view */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="px-3 py-3 font-semibold text-slate-700">会社名</th>
              <th className="px-3 py-3 font-semibold text-slate-700">所在地</th>
              <th className="px-3 py-3 font-semibold text-slate-700">業種</th>
              <th className="px-3 py-3 font-semibold text-slate-700">設立</th>
              <th className="px-3 py-3 font-semibold text-slate-700 text-right">資本金</th>
              <th className="px-3 py-3 font-semibold text-slate-700 text-right">拠点</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((company) => {
              const tags = parseJsonArray(company.industry_tags).slice(0, 2);
              return (
                <tr
                  key={company.company_id}
                  className="transition-colors hover:bg-slate-50"
                >
                  <td className="px-3 py-3 max-w-[200px]">
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/company/${company.company_id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline line-clamp-1"
                      >
                        {company.company_name ?? "—"}
                      </Link>
                      <ListingBadge status={company.listing_status} />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                    {company.location ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          >
                            {shortenTag(tag)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                    {extractYear(company.established_date)}
                  </td>
                  <td className="px-3 py-3 text-slate-600 text-right whitespace-nowrap">
                    {company.capital ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-500 text-right whitespace-nowrap text-xs">
                    {company.office_count ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {companies.map((company) => {
          const tags = parseJsonArray(company.industry_tags).slice(0, 3);
          return (
            <div
              key={company.company_id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/company/${company.company_id}`}
                  className="text-base font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {company.company_name ?? "—"}
                </Link>
                <ListingBadge status={company.listing_status} />
              </div>

              {company.location && (
                <p className="mt-1 text-sm text-slate-600">{company.location}</p>
              )}

              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {shortenTag(tag)}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>設立: {extractYear(company.established_date)}</span>
                {company.capital && <span>資本金: {company.capital}</span>}
                {company.office_count && <span>拠点: {company.office_count}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
