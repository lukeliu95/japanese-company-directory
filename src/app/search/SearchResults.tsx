'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import SearchBox from '@/components/SearchBox';
import type { CompanyListItem, PaginatedResult } from '@/types';

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
  if (!dateStr) return '\u2014';
  const match = dateStr.match(/(\d{4})/);
  return match ? `${match[1]}年` : '\u2014';
}

export default function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page')) || 1;

  const [result, setResult] = useState<PaginatedResult<CompanyListItem> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    if (!query.trim()) {
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&page=${page}`,
      );
      if (!res.ok) throw new Error('検索に失敗しました');
      const data = await res.json();
      setResult(data);
    } catch {
      setError('検索中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  function goToPage(newPage: number) {
    const params = new URLSearchParams();
    params.set('q', query);
    if (newPage > 1) params.set('page', String(newPage));
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div>
      {/* Search box */}
      <div className="mb-8">
        <SearchBox size="lg" defaultValue={query} />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center text-sm text-slate-500">
          検索中...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* No query */}
      {!query.trim() && !loading && (
        <div className="py-12 text-center text-sm text-slate-500">
          会社名やキーワードを入力して検索してください。
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          <p className="mb-4 text-sm text-slate-500">
            「{query}」の検索結果:{' '}
            <span className="font-medium text-slate-700">
              {result.total.toLocaleString()}件
            </span>
          </p>

          {result.items.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              該当する企業が見つかりませんでした。別のキーワードで検索してください。
            </div>
          ) : (
            <>
              {/* Results list */}
              <div className="space-y-4">
                {result.items.map((company) => {
                  const tags = parseJsonArray(company.industry_tags).slice(
                    0,
                    3,
                  );
                  return (
                    <div
                      key={company.company_id}
                      className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-blue-200"
                    >
                      <Link
                        href={`/company/${company.company_id}`}
                        className="text-base font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {company.company_name ?? '\u2014'}
                      </Link>
                      {company.location && (
                        <p className="mt-1 text-sm text-slate-500">
                          {company.location}
                        </p>
                      )}
                      {company.summary && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">
                          {company.summary}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="text-xs text-slate-400">
                          設立: {extractYear(company.established_date)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {result.totalPages > 1 && (
                <nav
                  aria-label="検索結果のページナビゲーション"
                  className="flex items-center justify-center gap-2 py-8"
                >
                  {result.hasPrev && (
                    <button
                      onClick={() => goToPage(page - 1)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      前へ
                    </button>
                  )}
                  <span className="px-3 py-2 text-sm text-slate-600">
                    {result.page} / {result.totalPages} ページ
                  </span>
                  {result.hasNext && (
                    <button
                      onClick={() => goToPage(page + 1)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      次へ
                    </button>
                  )}
                </nav>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
