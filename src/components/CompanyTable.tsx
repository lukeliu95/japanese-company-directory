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
  if (!dateStr) return "\u2014";
  const match = dateStr.match(/(\d{4})/);
  return match ? `${match[1]}年` : "\u2014";
}

function formatCapital(capital: string | null): string {
  if (!capital) return "\u2014";
  return capital;
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
              <th className="px-3 py-3 font-semibold text-slate-700">
                会社名
              </th>
              <th className="px-3 py-3 font-semibold text-slate-700">
                所在地
              </th>
              <th className="px-3 py-3 font-semibold text-slate-700">
                業種
              </th>
              <th className="px-3 py-3 font-semibold text-slate-700">
                設立
              </th>
              <th className="px-3 py-3 font-semibold text-slate-700">
                資本金
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((company) => {
              const tags = parseJsonArray(company.industry_tags).slice(0, 3);
              return (
                <tr
                  key={company.company_id}
                  className="transition-colors hover:bg-slate-50"
                >
                  <td className="px-3 py-3">
                    <Link
                      href={`/company/${company.company_id}`}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {company.company_name ?? "\u2014"}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {company.location ?? "\u2014"}
                  </td>
                  <td className="px-3 py-3">
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">{"\u2014"}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {extractYear(company.established_date)}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {formatCapital(company.capital)}
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
              <Link
                href={`/company/${company.company_id}`}
                className="text-base font-medium text-blue-600 hover:text-blue-800 hover:underline"
              >
                {company.company_name ?? "\u2014"}
              </Link>

              {company.location && (
                <p className="mt-1 text-sm text-slate-600">
                  {company.location}
                </p>
              )}

              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2 flex gap-4 text-xs text-slate-500">
                <span>
                  設立: {extractYear(company.established_date)}
                </span>
                <span>
                  資本金: {formatCapital(company.capital)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
