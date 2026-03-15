// Run: npx tsx scripts/migrate-to-turso.ts
// Requires: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars
// Dev dependency note: uses @libsql/client (already in dependencies) for both local and remote DBs

import { createClient, type Client, type InStatement, type InValue } from '@libsql/client';
import {
  PREFECTURES,
  INDUSTRIES,
  INDUSTRY_BY_NAME,
  parsePrefectureFromLocation,
  parseCityFromLocation,
} from '../src/lib/slugs';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BATCH_SIZE = 500;
const PROGRESS_INTERVAL = 10_000;

const SOURCE_DB_PATH = new URL('../../DB/companies_fixed.db', import.meta.url)
  .pathname;

// ---------------------------------------------------------------------------
// Database clients
// ---------------------------------------------------------------------------

function createSourceClient(): Client {
  return createClient({ url: `file:${SOURCE_DB_PATH}` });
}

function createTargetClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      'Missing TURSO_DATABASE_URL environment variable. ' +
        'Set it to your Turso database URL (e.g. libsql://your-db-your-org.turso.io)',
    );
  }

  return createClient({ url, authToken });
}

// ---------------------------------------------------------------------------
// City slug generation
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic slug for a Japanese city name.
 *
 * Since Japanese city names cannot be trivially romanized without a full
 * dictionary, we use a simplified approach: strip common suffixes and use the
 * raw characters as the slug (URL-encoded by the browser). This keeps slugs
 * human-readable in Japanese contexts and avoids the need for a romanization
 * library.
 *
 * Examples:
 *   "港区"     -> "港区"
 *   "札幌市"   -> "札幌市"
 *   "京都市"   -> "京都市"
 */
function citySlug(cityName: string): string {
  // Use the city name as-is (it's already concise like 港区, 札幌市, etc.)
  return cityName;
}

// ---------------------------------------------------------------------------
// Schema DDL
// ---------------------------------------------------------------------------

const SCHEMA_STATEMENTS: string[] = [
  // -- Main table
  `CREATE TABLE IF NOT EXISTS companies (
    company_id TEXT PRIMARY KEY,
    company_name TEXT,
    company_name_kana TEXT,
    company_name_en TEXT,
    location TEXT,
    listing_status TEXT,
    last_updated TEXT,
    corporate_number TEXT,
    securities_code TEXT,
    industry_tags TEXT,
    summary TEXT,
    description TEXT,
    business_keywords TEXT,
    features TEXT,
    established_date TEXT,
    ipo_date TEXT,
    capital TEXT,
    revenue TEXT,
    revenue_growth TEXT,
    employees TEXT,
    employee_growth TEXT,
    new_grad_hires TEXT,
    office_count TEXT,
    factory_count TEXT,
    listing_market TEXT,
    fiscal_month TEXT,
    representative_name TEXT,
    address TEXT,
    offices_info TEXT,
    page_url TEXT,
    prefecture_slug TEXT,
    city_slug TEXT
  )`,

  // -- Auxiliary tables
  `CREATE TABLE IF NOT EXISTS prefectures (
    slug TEXT PRIMARY KEY,
    name_ja TEXT,
    company_count INTEGER
  )`,

  `CREATE TABLE IF NOT EXISTS cities (
    slug TEXT,
    name_ja TEXT,
    prefecture_slug TEXT,
    company_count INTEGER,
    PRIMARY KEY (prefecture_slug, slug)
  )`,

  `CREATE TABLE IF NOT EXISTS industries (
    slug TEXT PRIMARY KEY,
    name_ja TEXT,
    company_count INTEGER
  )`,

  `CREATE TABLE IF NOT EXISTS company_industries (
    company_id TEXT,
    industry_slug TEXT,
    PRIMARY KEY (company_id, industry_slug)
  )`,

  `CREATE TABLE IF NOT EXISTS prefecture_industries (
    prefecture_slug TEXT,
    industry_slug TEXT,
    company_count INTEGER,
    PRIMARY KEY (prefecture_slug, industry_slug)
  )`,

  // -- Indexes
  `CREATE INDEX IF NOT EXISTS idx_location ON companies(location)`,
  `CREATE INDEX IF NOT EXISTS idx_company_name ON companies(company_name)`,
  `CREATE INDEX IF NOT EXISTS idx_prefecture_slug ON companies(prefecture_slug)`,
  `CREATE INDEX IF NOT EXISTS idx_city_slug ON companies(city_slug)`,
  `CREATE INDEX IF NOT EXISTS idx_corporate_number ON companies(corporate_number)`,
  `CREATE INDEX IF NOT EXISTS idx_listing_status ON companies(listing_status)`,
  `CREATE INDEX IF NOT EXISTS idx_ci_industry ON company_industries(industry_slug)`,
  `CREATE INDEX IF NOT EXISTS idx_cities_pref ON cities(prefecture_slug)`,
];

// FTS5 created separately after data load
const FTS5_CREATE = `CREATE VIRTUAL TABLE IF NOT EXISTS companies_fts USING fts5(
  company_name,
  company_name_kana,
  summary,
  business_keywords,
  content=companies,
  content_rowid=rowid
)`;

const FTS5_REBUILD = `INSERT INTO companies_fts(companies_fts) VALUES('rebuild')`;

// ---------------------------------------------------------------------------
// Source column list (matches source DB schema order)
// ---------------------------------------------------------------------------

const SOURCE_COLUMNS = [
  'company_id',
  'company_name',
  'company_name_kana',
  'company_name_en',
  'location',
  'listing_status',
  'last_updated',
  'corporate_number',
  'securities_code',
  'industry_tags',
  'summary',
  'description',
  'business_keywords',
  'features',
  'established_date',
  'ipo_date',
  'capital',
  'revenue',
  'revenue_growth',
  'employees',
  'employee_growth',
  'new_grad_hires',
  'office_count',
  'factory_count',
  'listing_market',
  'fiscal_month',
  'representative_name',
  'address',
  'offices_info',
  'page_url',
] as const;

// Target includes two derived columns
const TARGET_COLUMNS = [...SOURCE_COLUMNS, 'prefecture_slug', 'city_slug'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SourceRow {
  company_id: string;
  company_name: string | null;
  company_name_kana: string | null;
  company_name_en: string | null;
  location: string | null;
  listing_status: string | null;
  last_updated: string | null;
  corporate_number: string | null;
  securities_code: string | null;
  industry_tags: string | null;
  summary: string | null;
  description: string | null;
  business_keywords: string | null;
  features: string | null;
  established_date: string | null;
  ipo_date: string | null;
  capital: string | null;
  revenue: string | null;
  revenue_growth: string | null;
  employees: string | null;
  employee_growth: string | null;
  new_grad_hires: string | null;
  office_count: string | null;
  factory_count: string | null;
  listing_market: string | null;
  fiscal_month: string | null;
  representative_name: string | null;
  address: string | null;
  offices_info: string | null;
  page_url: string | null;
}

interface CompanyIndustry {
  company_id: string;
  industry_slug: string;
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== Japanese Company Directory: Turso Migration ===');
  console.log();

  // -- Connect to databases
  console.log(`[source] Connecting to local SQLite: ${SOURCE_DB_PATH}`);
  const sourceDb = createSourceClient();

  console.log(`[target] Connecting to Turso: ${process.env.TURSO_DATABASE_URL}`);
  const targetDb = createTargetClient();

  try {
    // -----------------------------------------------------------------------
    // Step 1: Create schema in Turso
    // -----------------------------------------------------------------------
    console.log();
    console.log('--- Step 1: Creating schema in Turso ---');

    // Drop existing tables for idempotency (reverse dependency order)
    const dropOrder = [
      'companies_fts',
      'prefecture_industries',
      'company_industries',
      'industries',
      'cities',
      'prefectures',
      'companies',
    ];

    for (const table of dropOrder) {
      // FTS5 virtual tables need special handling
      await targetDb.execute(`DROP TABLE IF EXISTS ${table}`);
    }
    console.log('  Dropped existing tables (idempotent reset)');

    // Create tables and indexes
    for (const stmt of SCHEMA_STATEMENTS) {
      await targetDb.execute(stmt);
    }
    console.log('  Created tables and indexes');

    // -----------------------------------------------------------------------
    // Step 2: Read source data and process
    // -----------------------------------------------------------------------
    console.log();
    console.log('--- Step 2: Reading source data ---');

    const countResult = await sourceDb.execute('SELECT COUNT(*) as cnt FROM companies');
    const totalRows = Number(countResult.rows[0].cnt);
    console.log(`  Total source records: ${totalRows.toLocaleString()}`);

    // Read all rows from source (streaming would be ideal but libsql client
    // doesn't support cursors on local files, so we paginate manually)
    const PAGE_SIZE = 10_000;
    let offset = 0;
    let processedCount = 0;
    let errorCount = 0;

    // Accumulators
    const companyIndustries: CompanyIndustry[] = [];
    const prefectureCounts = new Map<string, number>();
    const cityCounts = new Map<string, { name_ja: string; prefSlug: string; count: number }>();
    const industryCounts = new Map<string, number>();
    const prefIndustryCounts = new Map<string, number>(); // "pref|industry" -> count

    // Batch buffer for company inserts
    let companyBatch: InStatement[] = [];

    const placeholders = TARGET_COLUMNS.map(() => '?').join(', ');
    const insertSQL = `INSERT OR REPLACE INTO companies (${TARGET_COLUMNS.join(', ')}) VALUES (${placeholders})`;

    console.log();
    console.log('--- Step 3: Migrating companies in batches ---');
    const startTime = Date.now();

    while (offset < totalRows) {
      const pageResult = await sourceDb.execute({
        sql: `SELECT ${SOURCE_COLUMNS.join(', ')} FROM companies LIMIT ? OFFSET ?`,
        args: [PAGE_SIZE, offset],
      });

      for (const row of pageResult.rows) {
        try {
          const r = row as unknown as SourceRow;

          // -- Parse location -> prefecture_slug, city_slug
          const prefSlug = parsePrefectureFromLocation(r.location);
          let cSlug: string | null = null;
          let cityName: string | null = null;

          if (prefSlug) {
            cityName = parseCityFromLocation(r.location, prefSlug);
            if (cityName) {
              cSlug = citySlug(cityName);
            }
          }

          // -- Parse industry_tags -> company_industries records
          if (r.industry_tags) {
            try {
              const tags: string[] = JSON.parse(r.industry_tags);
              if (Array.isArray(tags)) {
                for (const tag of tags) {
                  const indSlug = INDUSTRY_BY_NAME.get(tag);
                  if (indSlug) {
                    companyIndustries.push({
                      company_id: r.company_id,
                      industry_slug: indSlug,
                    });

                    // Accumulate industry count
                    industryCounts.set(indSlug, (industryCounts.get(indSlug) ?? 0) + 1);

                    // Accumulate prefecture x industry count
                    if (prefSlug) {
                      const key = `${prefSlug}|${indSlug}`;
                      prefIndustryCounts.set(key, (prefIndustryCounts.get(key) ?? 0) + 1);
                    }
                  }
                }
              }
            } catch {
              // industry_tags is not valid JSON -- skip silently
            }
          }

          // -- Accumulate prefecture and city counts
          if (prefSlug) {
            prefectureCounts.set(prefSlug, (prefectureCounts.get(prefSlug) ?? 0) + 1);

            if (cSlug && cityName) {
              const cityKey = `${prefSlug}|${cSlug}`;
              const existing = cityCounts.get(cityKey);
              if (existing) {
                existing.count += 1;
              } else {
                cityCounts.set(cityKey, {
                  name_ja: cityName,
                  prefSlug,
                  count: 1,
                });
              }
            }
          }

          // -- Build insert args (order must match TARGET_COLUMNS)
          const args: InValue[] = SOURCE_COLUMNS.map((col) => {
            const val = (row as Record<string, InValue>)[col];
            return val === undefined ? null : val;
          });
          args.push(prefSlug);  // prefecture_slug
          args.push(cSlug);     // city_slug

          companyBatch.push({ sql: insertSQL, args });

          // -- Flush batch when full
          if (companyBatch.length >= BATCH_SIZE) {
            await targetDb.batch(companyBatch, 'write');
            companyBatch = [];
          }

          processedCount++;

          if (processedCount % PROGRESS_INTERVAL === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const pct = ((processedCount / totalRows) * 100).toFixed(1);
            console.log(
              `  [companies] ${processedCount.toLocaleString()} / ${totalRows.toLocaleString()} (${pct}%) -- ${elapsed}s elapsed`,
            );
          }
        } catch (err) {
          errorCount++;
          if (errorCount <= 10) {
            console.error(
              `  [error] Failed on company ${(row as Record<string, unknown>).company_id}: ${err}`,
            );
          }
          if (errorCount === 11) {
            console.error('  [error] Suppressing further individual error logs...');
          }
        }
      }

      offset += PAGE_SIZE;
    }

    // Flush remaining company batch
    if (companyBatch.length > 0) {
      await targetDb.batch(companyBatch, 'write');
      companyBatch = [];
    }

    const companyElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `  [companies] Done: ${processedCount.toLocaleString()} migrated, ${errorCount} errors -- ${companyElapsed}s`,
    );

    // -----------------------------------------------------------------------
    // Insert company_industries junction records
    // -----------------------------------------------------------------------
    console.log();
    console.log(`--- Inserting company_industries (${companyIndustries.length.toLocaleString()} records) ---`);

    const ciInsertSQL = 'INSERT OR REPLACE INTO company_industries (company_id, industry_slug) VALUES (?, ?)';
    let ciBatch: InStatement[] = [];
    let ciCount = 0;

    for (const ci of companyIndustries) {
      ciBatch.push({ sql: ciInsertSQL, args: [ci.company_id, ci.industry_slug] });

      if (ciBatch.length >= BATCH_SIZE) {
        await targetDb.batch(ciBatch, 'write');
        ciBatch = [];
      }

      ciCount++;
      if (ciCount % (PROGRESS_INTERVAL * 5) === 0) {
        console.log(
          `  [company_industries] ${ciCount.toLocaleString()} / ${companyIndustries.length.toLocaleString()}`,
        );
      }
    }

    if (ciBatch.length > 0) {
      await targetDb.batch(ciBatch, 'write');
    }

    console.log(`  [company_industries] Done: ${ciCount.toLocaleString()} inserted`);

    // -----------------------------------------------------------------------
    // Insert aggregated auxiliary tables
    // -----------------------------------------------------------------------
    console.log();
    console.log('--- Inserting auxiliary tables ---');

    // -- Prefectures
    const prefBatch: InStatement[] = [];
    for (const p of PREFECTURES) {
      const count = prefectureCounts.get(p.slug) ?? 0;
      prefBatch.push({
        sql: 'INSERT OR REPLACE INTO prefectures (slug, name_ja, company_count) VALUES (?, ?, ?)',
        args: [p.slug, p.name_ja, count],
      });
    }
    await targetDb.batch(prefBatch, 'write');
    console.log(`  [prefectures] Inserted ${prefBatch.length} prefectures`);

    // -- Cities
    let cityBatch: InStatement[] = [];
    let cityTotal = 0;
    for (const [, info] of Array.from(cityCounts)) {
      cityBatch.push({
        sql: 'INSERT OR REPLACE INTO cities (slug, name_ja, prefecture_slug, company_count) VALUES (?, ?, ?, ?)',
        args: [citySlug(info.name_ja), info.name_ja, info.prefSlug, info.count],
      });
      cityTotal++;

      if (cityBatch.length >= BATCH_SIZE) {
        await targetDb.batch(cityBatch, 'write');
        cityBatch = [];
      }
    }
    if (cityBatch.length > 0) {
      await targetDb.batch(cityBatch, 'write');
    }
    console.log(`  [cities] Inserted ${cityTotal.toLocaleString()} cities`);

    // -- Industries
    const indBatch: InStatement[] = [];
    for (const ind of INDUSTRIES) {
      const count = industryCounts.get(ind.slug) ?? 0;
      indBatch.push({
        sql: 'INSERT OR REPLACE INTO industries (slug, name_ja, company_count) VALUES (?, ?, ?)',
        args: [ind.slug, ind.name_ja, count],
      });
    }
    await targetDb.batch(indBatch, 'write');
    console.log(`  [industries] Inserted ${indBatch.length} industries`);

    // -- Prefecture x Industry (minimum 10 companies threshold)
    let piBatch: InStatement[] = [];
    let piTotal = 0;
    for (const [key, count] of Array.from(prefIndustryCounts)) {
      if (count < 10) continue; // Skip low-count combinations
      const [prefSlug, indSlug] = key.split('|');
      piBatch.push({
        sql: 'INSERT OR REPLACE INTO prefecture_industries (prefecture_slug, industry_slug, company_count) VALUES (?, ?, ?)',
        args: [prefSlug, indSlug, count],
      });
      piTotal++;

      if (piBatch.length >= BATCH_SIZE) {
        await targetDb.batch(piBatch, 'write');
        piBatch = [];
      }
    }
    if (piBatch.length > 0) {
      await targetDb.batch(piBatch, 'write');
    }
    console.log(`  [prefecture_industries] Inserted ${piTotal.toLocaleString()} cross-records (>= 10 companies)`);

    // -----------------------------------------------------------------------
    // Step 4: Create and rebuild FTS5 index
    // -----------------------------------------------------------------------
    console.log();
    console.log('--- Step 4: Building FTS5 search index ---');

    await targetDb.execute(FTS5_CREATE);
    console.log('  Created companies_fts virtual table');

    await targetDb.execute(FTS5_REBUILD);
    console.log('  Rebuilt FTS5 index from companies table');

    // -----------------------------------------------------------------------
    // Step 5: Verify counts
    // -----------------------------------------------------------------------
    console.log();
    console.log('--- Step 5: Verification ---');

    const [
      companiesCount,
      prefsCount,
      citiesCount,
      industriesCount,
      ciJunctionCount,
      piCount,
    ] = await Promise.all([
      targetDb.execute('SELECT COUNT(*) as cnt FROM companies'),
      targetDb.execute('SELECT COUNT(*) as cnt FROM prefectures'),
      targetDb.execute('SELECT COUNT(*) as cnt FROM cities'),
      targetDb.execute('SELECT COUNT(*) as cnt FROM industries'),
      targetDb.execute('SELECT COUNT(*) as cnt FROM company_industries'),
      targetDb.execute('SELECT COUNT(*) as cnt FROM prefecture_industries'),
    ]);

    console.log(`  Companies migrated:      ${Number(companiesCount.rows[0].cnt).toLocaleString()}`);
    console.log(`  Prefectures:             ${Number(prefsCount.rows[0].cnt)}`);
    console.log(`  Cities:                  ${Number(citiesCount.rows[0].cnt).toLocaleString()}`);
    console.log(`  Industries:              ${Number(industriesCount.rows[0].cnt)}`);
    console.log(`  Company-Industries:      ${Number(ciJunctionCount.rows[0].cnt).toLocaleString()}`);
    console.log(`  Prefecture-Industries:   ${Number(piCount.rows[0].cnt).toLocaleString()}`);

    // Summary
    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log();
    console.log(`=== Migration complete in ${totalElapsed}s ===`);

    if (errorCount > 0) {
      console.warn(`  WARNING: ${errorCount} individual record errors occurred (logged above)`);
    }
  } finally {
    sourceDb.close();
    targetDb.close();
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
