import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

function pageHref(basePath: string, page: number): string {
  if (page <= 1) return basePath;
  return `${basePath}?page=${page}`;
}

function getVisiblePages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];

  // Always show page 1
  pages.push(1);

  if (current > 3) {
    pages.push("ellipsis");
  }

  // Pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  // Always show last page
  if (total > 1) {
    pages.push(total);
  }

  return pages;
}

export default function Pagination({
  currentPage,
  totalPages,
  basePath,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages(currentPage, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav aria-label="ページナビゲーション" className="flex items-center justify-center gap-1 py-6">
      {/* Previous button */}
      {hasPrev ? (
        <Link
          href={pageHref(basePath, currentPage - 1)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          aria-label="前のページ"
        >
          前へ
        </Link>
      ) : (
        <span
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-300"
          aria-disabled="true"
        >
          前へ
        </span>
      )}

      {/* Page numbers */}
      {visiblePages.map((item, idx) => {
        if (item === "ellipsis") {
          return (
            <span
              key={`ellipsis-${idx}`}
              className="px-2 py-2 text-sm text-slate-400"
              aria-hidden="true"
            >
              ...
            </span>
          );
        }

        const isActive = item === currentPage;
        return isActive ? (
          <span
            key={item}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
            aria-current="page"
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={pageHref(basePath, item)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          >
            {item}
          </Link>
        );
      })}

      {/* Next button */}
      {hasNext ? (
        <Link
          href={pageHref(basePath, currentPage + 1)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          aria-label="次のページ"
        >
          次へ
        </Link>
      ) : (
        <span
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-300"
          aria-disabled="true"
        >
          次へ
        </span>
      )}
    </nav>
  );
}
