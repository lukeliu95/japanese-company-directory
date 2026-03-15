import db from '@/lib/db';
import {
  PREFECTURE_BY_SLUG,
  INDUSTRY_BY_SLUG,
} from '@/lib/slugs';
import type {
  Company,
  CompanyListItem,
  Prefecture,
  City,
  Industry,
  PaginatedResult,
} from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PER_PAGE = 50;
const HAS_NAME = "company_name IS NOT NULL AND company_name != ''";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a PaginatedResult from items, total count, and pagination parameters.
 */
function paginate<T>(
  items: T[],
  total: number,
  page: number,
  perPage: number,
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  return {
    items,
    total,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Clamp page to >= 1 and compute the SQL OFFSET.
 */
function pageOffset(page: number, perPage: number): { offset: number; safePage: number } {
  const safePage = Math.max(1, page);
  return { offset: (safePage - 1) * perPage, safePage };
}

// ---------------------------------------------------------------------------
// Company queries
// ---------------------------------------------------------------------------

/**
 * Fetch a single company by its company_id.
 */
export async function getCompanyById(id: string): Promise<Company | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM companies WHERE company_id = ?',
    args: [id],
  });

  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as Company;
}

/**
 * List companies filtered by prefecture slug with pagination.
 */
export async function getCompaniesByPrefecture(
  prefectureSlug: string,
  page: number,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<PaginatedResult<CompanyListItem>> {
  const { offset, safePage } = pageOffset(page, perPage);

  const [countResult, dataResult] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as cnt FROM companies WHERE prefecture_slug = ? AND ${HAS_NAME}`,
      args: [prefectureSlug],
    }),
    db.execute({
      sql: `SELECT company_id, company_name, location, industry_tags, summary,
                   established_date, capital, revenue
            FROM companies
            WHERE prefecture_slug = ? AND ${HAS_NAME}
            ORDER BY company_name ASC
            LIMIT ? OFFSET ?`,
      args: [prefectureSlug, perPage, offset],
    }),
  ]);

  const total = Number(countResult.rows[0]?.cnt ?? 0);
  const items = dataResult.rows as unknown as CompanyListItem[];
  return paginate(items, total, safePage, perPage);
}

/**
 * List companies filtered by prefecture and city slug with pagination.
 */
export async function getCompaniesByCity(
  prefectureSlug: string,
  citySlug: string,
  page: number,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<PaginatedResult<CompanyListItem>> {
  const { offset, safePage } = pageOffset(page, perPage);

  const [countResult, dataResult] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as cnt FROM companies
            WHERE prefecture_slug = ? AND city_slug = ? AND ${HAS_NAME}`,
      args: [prefectureSlug, citySlug],
    }),
    db.execute({
      sql: `SELECT company_id, company_name, location, industry_tags, summary,
                   established_date, capital, revenue
            FROM companies
            WHERE prefecture_slug = ? AND city_slug = ? AND ${HAS_NAME}
            ORDER BY company_name ASC
            LIMIT ? OFFSET ?`,
      args: [prefectureSlug, citySlug, perPage, offset],
    }),
  ]);

  const total = Number(countResult.rows[0]?.cnt ?? 0);
  const items = dataResult.rows as unknown as CompanyListItem[];
  return paginate(items, total, safePage, perPage);
}

/**
 * List companies filtered by industry slug with pagination.
 * Uses the company_industries junction table for safe, indexed lookups.
 */
export async function getCompaniesByIndustry(
  industrySlug: string,
  page: number,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<PaginatedResult<CompanyListItem>> {
  const { offset, safePage } = pageOffset(page, perPage);

  const industryName = INDUSTRY_BY_SLUG.get(industrySlug);
  if (!industryName) {
    return paginate([], 0, safePage, perPage);
  }

  const [countResult, dataResult] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as cnt FROM company_industries ci
            JOIN companies c ON c.company_id = ci.company_id
            WHERE ci.industry_slug = ? AND c.${HAS_NAME}`,
      args: [industrySlug],
    }),
    db.execute({
      sql: `SELECT c.company_id, c.company_name, c.location, c.industry_tags,
                   c.summary, c.established_date, c.capital, c.revenue
            FROM company_industries ci
            JOIN companies c ON c.company_id = ci.company_id
            WHERE ci.industry_slug = ? AND c.${HAS_NAME}
            ORDER BY c.company_name ASC
            LIMIT ? OFFSET ?`,
      args: [industrySlug, perPage, offset],
    }),
  ]);

  const total = Number(countResult.rows[0]?.cnt ?? 0);
  const items = dataResult.rows as unknown as CompanyListItem[];
  return paginate(items, total, safePage, perPage);
}

/**
 * List companies filtered by both prefecture and industry slug with pagination.
 * Uses the company_industries junction table for safe, indexed lookups.
 */
export async function getCompaniesByPrefectureAndIndustry(
  prefectureSlug: string,
  industrySlug: string,
  page: number,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<PaginatedResult<CompanyListItem>> {
  const { offset, safePage } = pageOffset(page, perPage);

  const industryName = INDUSTRY_BY_SLUG.get(industrySlug);
  if (!industryName) {
    return paginate([], 0, safePage, perPage);
  }

  const [countResult, dataResult] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as cnt FROM company_industries ci
            JOIN companies c ON c.company_id = ci.company_id
            WHERE c.prefecture_slug = ? AND ci.industry_slug = ? AND c.${HAS_NAME}`,
      args: [prefectureSlug, industrySlug],
    }),
    db.execute({
      sql: `SELECT c.company_id, c.company_name, c.location, c.industry_tags,
                   c.summary, c.established_date, c.capital, c.revenue
            FROM company_industries ci
            JOIN companies c ON c.company_id = ci.company_id
            WHERE c.prefecture_slug = ? AND ci.industry_slug = ? AND c.${HAS_NAME}
            ORDER BY c.company_name ASC
            LIMIT ? OFFSET ?`,
      args: [prefectureSlug, industrySlug, perPage, offset],
    }),
  ]);

  const total = Number(countResult.rows[0]?.cnt ?? 0);
  const items = dataResult.rows as unknown as CompanyListItem[];
  return paginate(items, total, safePage, perPage);
}

// ---------------------------------------------------------------------------
// Prefecture queries
// ---------------------------------------------------------------------------

/**
 * Return all prefectures with their company counts.
 * Reads from the pre-computed prefectures table.
 */
export async function getAllPrefectures(): Promise<Prefecture[]> {
  const result = await db.execute(
    'SELECT slug, name_ja, company_count FROM prefectures ORDER BY company_count DESC',
  );
  return result.rows as unknown as Prefecture[];
}

/**
 * Fetch a single prefecture by slug.
 * Reads from the pre-computed prefectures table, falls back to in-memory lookup.
 */
export async function getPrefectureBySlug(slug: string): Promise<Prefecture | null> {
  const name_ja = PREFECTURE_BY_SLUG.get(slug);
  if (!name_ja) return null;

  const result = await db.execute({
    sql: 'SELECT slug, name_ja, company_count FROM prefectures WHERE slug = ?',
    args: [slug],
  });

  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as Prefecture;
}

// ---------------------------------------------------------------------------
// City queries
// ---------------------------------------------------------------------------

/**
 * Return all cities within a prefecture, ordered by company count descending.
 * Reads from the pre-computed cities table.
 */
export async function getCitiesByPrefecture(prefectureSlug: string): Promise<City[]> {
  const result = await db.execute({
    sql: `SELECT slug, name_ja, prefecture_slug, company_count
          FROM cities
          WHERE prefecture_slug = ?
          ORDER BY company_count DESC`,
    args: [prefectureSlug],
  });
  return result.rows as unknown as City[];
}

/**
 * Fetch a single city by its prefecture slug and city slug.
 * Reads from the pre-computed cities table.
 */
export async function getCityBySlug(
  prefectureSlug: string,
  citySlug: string,
): Promise<City | null> {
  const result = await db.execute({
    sql: `SELECT slug, name_ja, prefecture_slug, company_count
          FROM cities
          WHERE prefecture_slug = ? AND slug = ?`,
    args: [prefectureSlug, citySlug],
  });

  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as City;
}

// ---------------------------------------------------------------------------
// Industry queries
// ---------------------------------------------------------------------------

/**
 * Return all industries with their company counts.
 * Reads from the pre-computed industries table.
 */
export async function getAllIndustries(): Promise<Industry[]> {
  const result = await db.execute(
    'SELECT slug, name_ja, company_count FROM industries ORDER BY company_count DESC',
  );
  return result.rows as unknown as Industry[];
}

/**
 * Return industries available within a specific prefecture.
 * Reads from the prefecture_industries junction table joined with industries
 * for the Japanese display name.
 */
export async function getIndustriesByPrefecture(
  prefectureSlug: string,
): Promise<Industry[]> {
  const result = await db.execute({
    sql: `SELECT pi.industry_slug AS slug, i.name_ja, pi.company_count
          FROM prefecture_industries pi
          JOIN industries i ON i.slug = pi.industry_slug
          WHERE pi.prefecture_slug = ?
          ORDER BY pi.company_count DESC`,
    args: [prefectureSlug],
  });
  return result.rows as unknown as Industry[];
}

/**
 * Fetch a single industry by slug.
 */
export async function getIndustryBySlug(slug: string): Promise<Industry | null> {
  const result = await db.execute({
    sql: 'SELECT slug, name_ja, company_count FROM industries WHERE slug = ?',
    args: [slug],
  });

  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as Industry;
}

/**
 * Get the company count for a specific prefecture + industry combination.
 * Reads from the pre-computed prefecture_industries junction table.
 */
export async function getPrefectureIndustryCount(
  prefectureSlug: string,
  industrySlug: string,
): Promise<number> {
  const result = await db.execute({
    sql: `SELECT company_count FROM prefecture_industries
          WHERE prefecture_slug = ? AND industry_slug = ?`,
    args: [prefectureSlug, industrySlug],
  });

  if (result.rows.length === 0) return 0;
  return Number(result.rows[0].company_count ?? 0);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Search companies by query string.
 * Attempts FTS5 first (companies_fts table), falls back to LIKE prefix match
 * if the FTS query fails (e.g., table does not exist or syntax error).
 */
export async function searchCompanies(
  query: string,
  page: number,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<PaginatedResult<CompanyListItem>> {
  const { offset, safePage } = pageOffset(page, perPage);
  const trimmed = query.trim();

  if (!trimmed) {
    return paginate([], 0, safePage, perPage);
  }

  // --- Try FTS5 first ---
  try {
    const [countResult, dataResult] = await Promise.all([
      db.execute({
        sql: `SELECT COUNT(*) as cnt
              FROM companies_fts
              WHERE companies_fts MATCH ?`,
        args: [trimmed],
      }),
      db.execute({
        sql: `SELECT c.company_id, c.company_name, c.location, c.industry_tags,
                     c.summary, c.established_date, c.capital, c.revenue
              FROM companies_fts fts
              JOIN companies c ON c.rowid = fts.rowid
              WHERE companies_fts MATCH ?
              ORDER BY rank
              LIMIT ? OFFSET ?`,
        args: [trimmed, perPage, offset],
      }),
    ]);

    const total = Number(countResult.rows[0]?.cnt ?? 0);
    const items = dataResult.rows as unknown as CompanyListItem[];
    return paginate(items, total, safePage, perPage);
  } catch {
    // FTS5 unavailable or query syntax error -- fall back to LIKE
  }

  // --- LIKE fallback: prefix match on company_name ---
  const likePattern = `${trimmed}%`;

  const [countResult, dataResult] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as cnt FROM companies
            WHERE company_name LIKE ? AND ${HAS_NAME}`,
      args: [likePattern],
    }),
    db.execute({
      sql: `SELECT company_id, company_name, location, industry_tags, summary,
                   established_date, capital, revenue
            FROM companies
            WHERE company_name LIKE ? AND ${HAS_NAME}
            ORDER BY company_name ASC
            LIMIT ? OFFSET ?`,
      args: [likePattern, perPage, offset],
    }),
  ]);

  const total = Number(countResult.rows[0]?.cnt ?? 0);
  const items = dataResult.rows as unknown as CompanyListItem[];
  return paginate(items, total, safePage, perPage);
}

// ---------------------------------------------------------------------------
// Recent companies
// ---------------------------------------------------------------------------

/**
 * Return the most recently updated companies.
 */
export async function getRecentCompanies(limit: number): Promise<CompanyListItem[]> {
  const result = await db.execute({
    sql: `SELECT company_id, company_name, location, industry_tags, summary,
                 established_date, capital, revenue
          FROM companies
          WHERE ${HAS_NAME}
          ORDER BY last_updated DESC
          LIMIT ?`,
    args: [limit],
  });
  return result.rows as unknown as CompanyListItem[];
}
