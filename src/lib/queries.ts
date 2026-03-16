import { unstable_cache } from 'next/cache';
import { query } from '@/lib/db';
import {
  PREFECTURES,
  INDUSTRIES,
  PREFECTURE_BY_SLUG,
  INDUSTRY_BY_SLUG,
  INDUSTRY_BY_NAME,
  parsePrefectureFromLocation,
  parseCityFromLocation,
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

const TABLE = 'enterprise_baseconnect_in';
const DEFAULT_PER_PAGE = 50;
const HAS_NAME = "company_name IS NOT NULL AND company_name != ''";
// Guard against malformed JSON in industry_tags before using JSON functions
const VALID_JSON_TAGS = "industry_tags IS NOT NULL AND JSON_VALID(industry_tags)";

// Build a CASE expression that maps location prefix → prefecture slug.
// e.g. WHEN location LIKE '東京都%' THEN 'tokyo'
const PREF_CASE = `CASE ${PREFECTURES.map(
  (p) => `WHEN location LIKE '${p.name_ja}%' THEN '${p.slug}'`,
).join(' ')} END`;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

function pageOffset(page: number, perPage: number): { offset: number; safePage: number } {
  const safePage = Math.max(1, page);
  return { offset: (safePage - 1) * perPage, safePage };
}

/** Convert prefectureSlug to the Japanese name used in location strings. */
function prefName(slug: string): string | null {
  return PREFECTURE_BY_SLUG.get(slug) ?? null;
}

/** Enrich a company row with derived prefecture_slug / city_slug. */
function enrichCompany(row: Record<string, unknown>): Company {
  const location = (row.location as string) ?? '';
  const prefSlug = parsePrefectureFromLocation(location);
  const citySlug = prefSlug ? parseCityFromLocation(location, prefSlug) : null;
  return { ...row, prefecture_slug: prefSlug, city_slug: citySlug } as unknown as Company;
}

// ---------------------------------------------------------------------------
// Company queries
// ---------------------------------------------------------------------------

export async function getCompanyById(id: string): Promise<Company | null> {
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM ${TABLE} WHERE company_id = ?`,
    [id],
  );
  if (!rows.length) return null;
  return enrichCompany(rows[0]);
}

export async function getCompaniesByPrefecture(
  prefectureSlug: string,
  page: number,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<PaginatedResult<CompanyListItem>> {
  const { offset, safePage } = pageOffset(page, perPage);
  const name = prefName(prefectureSlug);
  if (!name) return paginate([], 0, safePage, perPage);

  const likeParam = `${name}%`;
  const [countRows, dataRows] = await Promise.all([
    query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM ${TABLE} WHERE location LIKE ? AND ${HAS_NAME}`,
      [likeParam],
    ),
    query<CompanyListItem>(
      `SELECT company_id, company_name, location, industry_tags, summary,
              established_date, capital, revenue, listing_status, office_count
       FROM ${TABLE}
       WHERE location LIKE ? AND ${HAS_NAME}
       ORDER BY company_name ASC
       LIMIT ? OFFSET ?`,
      [likeParam, perPage, offset],
    ),
  ]);

  return paginate(dataRows, Number(countRows[0]?.cnt ?? 0), safePage, perPage);
}

export async function getCompaniesByCity(
  prefectureSlug: string,
  citySlug: string,
  page: number,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<PaginatedResult<CompanyListItem>> {
  const { offset, safePage } = pageOffset(page, perPage);
  const name = prefName(prefectureSlug);
  if (!name) return paginate([], 0, safePage, perPage);

  // city_slug is the raw Japanese city name (e.g. '渋谷区'), so the pattern is '東京都渋谷区%'
  const likeParam = `${name}${citySlug}%`;
  const [countRows, dataRows] = await Promise.all([
    query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM ${TABLE} WHERE location LIKE ? AND ${HAS_NAME}`,
      [likeParam],
    ),
    query<CompanyListItem>(
      `SELECT company_id, company_name, location, industry_tags, summary,
              established_date, capital, revenue, listing_status, office_count
       FROM ${TABLE}
       WHERE location LIKE ? AND ${HAS_NAME}
       ORDER BY company_name ASC
       LIMIT ? OFFSET ?`,
      [likeParam, perPage, offset],
    ),
  ]);

  return paginate(dataRows, Number(countRows[0]?.cnt ?? 0), safePage, perPage);
}

export async function getCompaniesByIndustry(
  industrySlug: string,
  page: number,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<PaginatedResult<CompanyListItem>> {
  const { offset, safePage } = pageOffset(page, perPage);
  const industryName = INDUSTRY_BY_SLUG.get(industrySlug);
  if (!industryName) return paginate([], 0, safePage, perPage);

  const [countRows, dataRows] = await Promise.all([
    query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM ${TABLE}
       WHERE ${VALID_JSON_TAGS} AND JSON_SEARCH(industry_tags, 'one', ?) IS NOT NULL AND ${HAS_NAME}`,
      [industryName],
    ),
    query<CompanyListItem>(
      `SELECT company_id, company_name, location, industry_tags, summary,
              established_date, capital, revenue, listing_status, office_count
       FROM ${TABLE}
       WHERE ${VALID_JSON_TAGS} AND JSON_SEARCH(industry_tags, 'one', ?) IS NOT NULL AND ${HAS_NAME}
       ORDER BY company_name ASC
       LIMIT ? OFFSET ?`,
      [industryName, perPage, offset],
    ),
  ]);

  return paginate(dataRows, Number(countRows[0]?.cnt ?? 0), safePage, perPage);
}

export async function getCompaniesByPrefectureAndIndustry(
  prefectureSlug: string,
  industrySlug: string,
  page: number,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<PaginatedResult<CompanyListItem>> {
  const { offset, safePage } = pageOffset(page, perPage);
  const name = prefName(prefectureSlug);
  const industryName = INDUSTRY_BY_SLUG.get(industrySlug);
  if (!name || !industryName) return paginate([], 0, safePage, perPage);

  const likeParam = `${name}%`;
  const [countRows, dataRows] = await Promise.all([
    query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM ${TABLE}
       WHERE location LIKE ? AND ${VALID_JSON_TAGS} AND JSON_SEARCH(industry_tags, 'one', ?) IS NOT NULL AND ${HAS_NAME}`,
      [likeParam, industryName],
    ),
    query<CompanyListItem>(
      `SELECT company_id, company_name, location, industry_tags, summary,
              established_date, capital, revenue, listing_status, office_count
       FROM ${TABLE}
       WHERE location LIKE ? AND ${VALID_JSON_TAGS} AND JSON_SEARCH(industry_tags, 'one', ?) IS NOT NULL AND ${HAS_NAME}
       ORDER BY company_name ASC
       LIMIT ? OFFSET ?`,
      [likeParam, industryName, perPage, offset],
    ),
  ]);

  return paginate(dataRows, Number(countRows[0]?.cnt ?? 0), safePage, perPage);
}

// ---------------------------------------------------------------------------
// Prefecture queries
// ---------------------------------------------------------------------------

export async function getAllPrefectures(): Promise<Prefecture[]> {
  const rows = await query<{ slug: string; company_count: string }>(
    `SELECT ${PREF_CASE} AS slug, COUNT(*) AS company_count
     FROM ${TABLE}
     WHERE ${HAS_NAME}
     GROUP BY slug
     HAVING slug IS NOT NULL
     ORDER BY company_count DESC`,
  );
  return rows.map((r) => ({
    slug: r.slug,
    name_ja: PREFECTURE_BY_SLUG.get(r.slug) ?? r.slug,
    company_count: Number(r.company_count),
  }));
}

export async function getPrefectureBySlug(slug: string): Promise<Prefecture | null> {
  const name_ja = PREFECTURE_BY_SLUG.get(slug);
  if (!name_ja) return null;

  const rows = await query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM ${TABLE} WHERE location LIKE ? AND ${HAS_NAME}`,
    [`${name_ja}%`],
  );
  return { slug, name_ja, company_count: Number(rows[0]?.cnt ?? 0) };
}

// ---------------------------------------------------------------------------
// City queries
// ---------------------------------------------------------------------------

export async function getCitiesByPrefecture(prefectureSlug: string): Promise<City[]> {
  const name = prefName(prefectureSlug);
  if (!name) return [];

  // Extract the city name: the text after the prefecture name up to the first 市/区/町/村/郡
  const rows = await query<{ city_slug: string; company_count: string }>(
    `SELECT
       REGEXP_SUBSTR(SUBSTRING(location, CHAR_LENGTH(?) + 1), '^.+?[市区町村郡]') AS city_slug,
       COUNT(*) AS company_count
     FROM ${TABLE}
     WHERE location LIKE CONCAT(?, '%') AND ${HAS_NAME}
     GROUP BY city_slug
     HAVING city_slug IS NOT NULL AND city_slug != ''
     ORDER BY company_count DESC
     LIMIT 500`,
    [name, name],
  );

  return rows.map((r) => ({
    slug: r.city_slug,
    name_ja: r.city_slug,
    prefecture_slug: prefectureSlug,
    company_count: Number(r.company_count),
  }));
}

export async function getCityBySlug(
  prefectureSlug: string,
  citySlug: string,
): Promise<City | null> {
  const name = prefName(prefectureSlug);
  if (!name) return null;

  const rows = await query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM ${TABLE}
     WHERE location LIKE CONCAT(?, ?, '%') AND ${HAS_NAME}`,
    [name, citySlug],
  );
  const count = Number(rows[0]?.cnt ?? 0);
  if (count === 0) return null;

  return { slug: citySlug, name_ja: citySlug, prefecture_slug: prefectureSlug, company_count: count };
}

// ---------------------------------------------------------------------------
// Industry queries
// ---------------------------------------------------------------------------

export async function getAllIndustries(): Promise<Industry[]> {
  const rows = await query<{ name_ja: string; company_count: string }>(
    `SELECT jt.tag AS name_ja, COUNT(*) AS company_count
     FROM ${TABLE}
     CROSS JOIN JSON_TABLE(
       industry_tags,
       '$[*]' COLUMNS (tag VARCHAR(200) PATH '$')
     ) jt
     WHERE ${VALID_JSON_TAGS} AND ${HAS_NAME}
     GROUP BY jt.tag
     ORDER BY company_count DESC`,
  );

  const INDUSTRY_NAMES = new Set<string>(INDUSTRIES.map((i) => i.name_ja));
  const nameToSlug = INDUSTRY_BY_NAME as Map<string, string>;
  return rows
    .filter((r) => INDUSTRY_NAMES.has(r.name_ja))
    .map((r) => ({
      slug: nameToSlug.get(r.name_ja) ?? '',
      name_ja: r.name_ja,
      company_count: Number(r.company_count),
    }))
    .filter((r) => r.slug);
}

export async function getIndustriesByPrefecture(prefectureSlug: string): Promise<Industry[]> {
  const name = prefName(prefectureSlug);
  if (!name) return [];

  const rows = await query<{ name_ja: string; company_count: string }>(
    `SELECT jt.tag AS name_ja, COUNT(*) AS company_count
     FROM ${TABLE}
     CROSS JOIN JSON_TABLE(
       industry_tags,
       '$[*]' COLUMNS (tag VARCHAR(200) PATH '$')
     ) jt
     WHERE location LIKE CONCAT(?, '%') AND ${VALID_JSON_TAGS} AND ${HAS_NAME}
     GROUP BY jt.tag
     ORDER BY company_count DESC`,
    [name],
  );

  const INDUSTRY_NAMES = new Set<string>(INDUSTRIES.map((i) => i.name_ja));
  const nameToSlug = INDUSTRY_BY_NAME as Map<string, string>;
  return rows
    .filter((r) => INDUSTRY_NAMES.has(r.name_ja))
    .map((r) => ({
      slug: nameToSlug.get(r.name_ja) ?? '',
      name_ja: r.name_ja,
      company_count: Number(r.company_count),
    }))
    .filter((r) => r.slug);
}

export async function getIndustryBySlug(slug: string): Promise<Industry | null> {
  const industryName = INDUSTRY_BY_SLUG.get(slug);
  if (!industryName) return null;

  const rows = await query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM ${TABLE}
     WHERE ${VALID_JSON_TAGS} AND JSON_SEARCH(industry_tags, 'one', ?) IS NOT NULL AND ${HAS_NAME}`,
    [industryName],
  );
  return { slug, name_ja: industryName, company_count: Number(rows[0]?.cnt ?? 0) };
}

export async function getPrefectureIndustryCount(
  prefectureSlug: string,
  industrySlug: string,
): Promise<number> {
  const name = prefName(prefectureSlug);
  const industryName = INDUSTRY_BY_SLUG.get(industrySlug);
  if (!name || !industryName) return 0;

  const rows = await query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM ${TABLE}
     WHERE location LIKE ? AND ${VALID_JSON_TAGS} AND JSON_SEARCH(industry_tags, 'one', ?) IS NOT NULL AND ${HAS_NAME}`,
    [`${name}%`, industryName],
  );
  return Number(rows[0]?.cnt ?? 0);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchCompanies(
  searchQuery: string,
  page: number,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<PaginatedResult<CompanyListItem>> {
  const { offset, safePage } = pageOffset(page, perPage);
  const trimmed = searchQuery.trim();

  if (!trimmed) return paginate([], 0, safePage, perPage);

  const likePattern = `%${trimmed}%`;
  const [countRows, dataRows] = await Promise.all([
    query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM ${TABLE}
       WHERE (company_name LIKE ? OR company_name_kana LIKE ? OR summary LIKE ?)
         AND ${HAS_NAME}`,
      [likePattern, likePattern, likePattern],
    ),
    query<CompanyListItem>(
      `SELECT company_id, company_name, location, industry_tags, summary,
              established_date, capital, revenue, listing_status, office_count
       FROM ${TABLE}
       WHERE (company_name LIKE ? OR company_name_kana LIKE ? OR summary LIKE ?)
         AND ${HAS_NAME}
       ORDER BY company_name ASC
       LIMIT ? OFFSET ?`,
      [likePattern, likePattern, likePattern, perPage, offset],
    ),
  ]);

  return paginate(dataRows, Number(countRows[0]?.cnt ?? 0), safePage, perPage);
}

// ---------------------------------------------------------------------------
// Recent companies
// ---------------------------------------------------------------------------

export async function getRecentCompanies(limit: number): Promise<CompanyListItem[]> {
  return query<CompanyListItem>(
    `SELECT company_id, company_name, location, industry_tags, summary,
            established_date, capital, revenue, listing_status, office_count
     FROM ${TABLE}
     WHERE ${HAS_NAME}
     ORDER BY last_updated DESC
     LIMIT ?`,
    [limit],
  );
}

// ---------------------------------------------------------------------------
// Cached versions for homepage (avoid full-table-scan on every SSR request)
// ---------------------------------------------------------------------------

/** Cached prefecture list — revalidates every 24 h. */
export const getCachedPrefectures = unstable_cache(
  getAllPrefectures,
  ['all-prefectures'],
  { revalidate: 86400 },
);

/** Cached industry list (JSON_TABLE cross-join is expensive) — revalidates every 24 h. */
export const getCachedIndustries = unstable_cache(
  getAllIndustries,
  ['all-industries'],
  { revalidate: 86400 },
);

/** Cached recent companies — revalidates every hour. */
export const getCachedRecentCompanies = unstable_cache(
  (limit: number) => getRecentCompanies(limit),
  ['recent-companies'],
  { revalidate: 3600 },
);

/** Cached cities by prefecture (REGEXP_SUBSTR scan is expensive) — revalidates every 24 h. */
export const getCachedCitiesByPrefecture = unstable_cache(
  (prefectureSlug: string) => getCitiesByPrefecture(prefectureSlug),
  ['cities-by-prefecture'],
  { revalidate: 86400 },
);

/** Cached industry list by prefecture (JSON_TABLE CROSS JOIN is expensive) — revalidates every 24 h. */
export const getCachedIndustriesByPrefecture = unstable_cache(
  (prefectureSlug: string) => getIndustriesByPrefecture(prefectureSlug),
  ['industries-by-prefecture'],
  { revalidate: 86400 },
);

/** Cached prefecture×industry company count — revalidates every 24 h. */
export const getCachedPrefectureIndustryCount = unstable_cache(
  (prefectureSlug: string, industrySlug: string) =>
    getPrefectureIndustryCount(prefectureSlug, industrySlug),
  ['prefecture-industry-count'],
  { revalidate: 86400 },
);
