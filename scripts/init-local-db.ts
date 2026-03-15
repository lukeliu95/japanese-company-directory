// Run: npx tsx scripts/init-local-db.ts
// Creates local.db from companies_fixed.db with all auxiliary tables needed for the app.
// No remote Turso needed — everything runs locally.

import { createClient, type InStatement } from '@libsql/client';
import {
  PREFECTURES,
  PREFECTURE_BY_NAME,
  INDUSTRIES,
  INDUSTRY_BY_NAME,
  parsePrefectureFromLocation,
} from '../src/lib/slugs';

const SOURCE_PATH = '../DB/companies_fixed.db';
const TARGET_PATH = './local.db';
const BATCH_SIZE = 500;
const READ_PAGE_SIZE = 10000;

async function main() {
  const source = createClient({ url: `file:${SOURCE_PATH}` });
  const target = createClient({ url: `file:${TARGET_PATH}` });

  console.log('=== 本地数据库初始化 ===');
  console.log(`源: ${SOURCE_PATH}`);
  console.log(`目标: ${TARGET_PATH}`);

  // --- Step 1: Create schema ---
  console.log('\n[1/6] 创建表结构...');
  await target.executeMultiple(`
    DROP TABLE IF EXISTS company_industries;
    DROP TABLE IF EXISTS prefecture_industries;
    DROP TABLE IF EXISTS cities;
    DROP TABLE IF EXISTS industries;
    DROP TABLE IF EXISTS prefectures;
    DROP TABLE IF EXISTS companies;

    CREATE TABLE companies (
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
    );

    CREATE TABLE prefectures (
      slug TEXT PRIMARY KEY,
      name_ja TEXT,
      company_count INTEGER
    );

    CREATE TABLE cities (
      slug TEXT,
      name_ja TEXT,
      prefecture_slug TEXT,
      company_count INTEGER,
      PRIMARY KEY (prefecture_slug, slug)
    );

    CREATE TABLE industries (
      slug TEXT PRIMARY KEY,
      name_ja TEXT,
      company_count INTEGER
    );

    CREATE TABLE company_industries (
      company_id TEXT,
      industry_slug TEXT,
      PRIMARY KEY (company_id, industry_slug)
    );

    CREATE TABLE prefecture_industries (
      prefecture_slug TEXT,
      industry_slug TEXT,
      company_count INTEGER,
      PRIMARY KEY (prefecture_slug, industry_slug)
    );
  `);

  // --- Step 2: Copy companies with slug enrichment ---
  console.log('[2/6] 迁移企业数据...');

  const countResult = await source.execute('SELECT COUNT(*) as cnt FROM companies');
  const totalCompanies = Number(countResult.rows[0].cnt);
  console.log(`  总记录数: ${totalCompanies.toLocaleString()}`);

  // Accumulators
  const prefCounts = new Map<string, number>();
  const cityCounts = new Map<string, { name: string; count: number }>();
  const industryCounts = new Map<string, number>();
  const prefIndustryCounts = new Map<string, number>();
  const ciJunction: { companyId: string; industrySlug: string }[] = [];

  let processed = 0;
  const insertSql = `INSERT OR REPLACE INTO companies VALUES (${Array(32).fill('?').join(',')})`;
  const pendingStmts: InStatement[] = [];
  const startTime = Date.now();

  async function flushBatch() {
    if (pendingStmts.length === 0) return;
    await target.batch(pendingStmts, 'write');
    pendingStmts.length = 0;
  }

  for (let offset = 0; offset < totalCompanies; offset += READ_PAGE_SIZE) {
    const page = await source.execute({
      sql: `SELECT * FROM companies LIMIT ? OFFSET ?`,
      args: [READ_PAGE_SIZE, offset],
    });

    for (const row of page.rows) {
      const companyId = row.company_id as string;
      const location = (row.location as string) || '';

      // Parse location → prefecture_slug + city_slug
      const prefSlug = parsePrefectureFromLocation(location);
      let citySlug: string | null = null;

      if (prefSlug) {
        const prefEntry = PREFECTURES.find(p => p.slug === prefSlug);
        if (prefEntry) {
          const idx = location.indexOf(prefEntry.name_ja);
          if (idx !== -1) {
            citySlug = location.slice(idx + prefEntry.name_ja.length).trim() || null;
          }
        }
        prefCounts.set(prefSlug, (prefCounts.get(prefSlug) || 0) + 1);
        if (citySlug) {
          const cityKey = `${prefSlug}::${citySlug}`;
          const existing = cityCounts.get(cityKey);
          if (existing) {
            existing.count++;
          } else {
            cityCounts.set(cityKey, { name: citySlug, count: 1 });
          }
        }
      }

      // Parse industry_tags
      const rawTags = row.industry_tags as string;
      if (rawTags) {
        try {
          const tags = JSON.parse(rawTags);
          if (Array.isArray(tags)) {
            for (const tag of tags) {
              const slug = INDUSTRY_BY_NAME.get(tag);
              if (slug) {
                ciJunction.push({ companyId, industrySlug: slug });
                industryCounts.set(slug, (industryCounts.get(slug) || 0) + 1);
                if (prefSlug) {
                  const piKey = `${prefSlug}::${slug}`;
                  prefIndustryCounts.set(piKey, (prefIndustryCounts.get(piKey) || 0) + 1);
                }
              }
            }
          }
        } catch {
          // Invalid JSON — skip
        }
      }

      const v = (k: string) => {
        const val = row[k];
        if (val === null || val === undefined) return null;
        return String(val);
      };
      pendingStmts.push({
        sql: insertSql,
        args: [
          companyId,
          v('company_name'), v('company_name_kana'), v('company_name_en'),
          v('location'), v('listing_status'), v('last_updated'),
          v('corporate_number'), v('securities_code'), v('industry_tags'),
          v('summary'), v('description'), v('business_keywords'),
          v('features'), v('established_date'), v('ipo_date'),
          v('capital'), v('revenue'), v('revenue_growth'),
          v('employees'), v('employee_growth'), v('new_grad_hires'),
          v('office_count'), v('factory_count'), v('listing_market'),
          v('fiscal_month'), v('representative_name'), v('address'),
          v('offices_info'), v('page_url'),
          prefSlug, citySlug,
        ],
      });

      if (pendingStmts.length >= BATCH_SIZE) {
        await flushBatch();
      }

      processed++;
      if (processed % 10000 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const pct = ((processed / totalCompanies) * 100).toFixed(1);
        console.log(`  ${processed.toLocaleString()} / ${totalCompanies.toLocaleString()} (${pct}%) — ${elapsed}s`);
      }
    }
  }

  await flushBatch();

  console.log(`  完成: ${processed.toLocaleString()} 条企业记录`);

  // --- Step 3: Insert auxiliary tables ---
  console.log('[3/6] 写入都道府県表...');
  for (const [slug, count] of prefCounts) {
    const prefEntry = PREFECTURES.find(p => p.slug === slug);
    await target.execute({
      sql: 'INSERT OR REPLACE INTO prefectures VALUES (?, ?, ?)',
      args: [slug, prefEntry?.name_ja || slug, count],
    });
  }
  console.log(`  ${prefCounts.size} 个都道府県`);

  console.log('[4/6] 写入市区町村表...');
  let cityCount = 0;
  for (const [key, data] of cityCounts) {
    const [prefSlug, ] = key.split('::');
    await target.execute({
      sql: 'INSERT OR REPLACE INTO cities VALUES (?, ?, ?, ?)',
      args: [data.name, data.name, prefSlug, data.count],
    });
    cityCount++;
  }
  console.log(`  ${cityCount} 个市区町村`);

  console.log('[5/6] 写入行业表 + company_industries...');
  for (const ind of INDUSTRIES) {
    const count = industryCounts.get(ind.slug) || 0;
    if (count > 0) {
      await target.execute({
        sql: 'INSERT OR REPLACE INTO industries VALUES (?, ?, ?)',
        args: [ind.slug, ind.name_ja, count],
      });
    }
  }

  // Insert company_industries in batches
  let ciCount = 0;
  for (let i = 0; i < ciJunction.length; i += BATCH_SIZE) {
    const chunk = ciJunction.slice(i, i + BATCH_SIZE);
    await target.batch(
      chunk.map(ci => ({
        sql: 'INSERT OR REPLACE INTO company_industries VALUES (?, ?)',
        args: [ci.companyId, ci.industrySlug],
      })),
      'write',
    );
    ciCount += chunk.length;
    if (ciCount % 100000 === 0) {
      console.log(`  company_industries: ${ciCount.toLocaleString()} / ${ciJunction.length.toLocaleString()}`);
    }
  }
  console.log(`  ${industryCounts.size} 个行业, ${ciCount.toLocaleString()} 条关联记录`);

  // prefecture_industries (min 10)
  console.log('[6/6] 写入都道府県 x 行业交叉表...');
  let piCount = 0;
  for (const [key, count] of prefIndustryCounts) {
    if (count < 10) continue;
    const [prefSlug, indSlug] = key.split('::');
    await target.execute({
      sql: 'INSERT OR REPLACE INTO prefecture_industries VALUES (?, ?, ?)',
      args: [prefSlug, indSlug, count],
    });
    piCount++;
  }
  console.log(`  ${piCount} 个交叉组合 (>= 10社)`);

  // --- Indexes ---
  console.log('\n创建索引...');
  await target.executeMultiple(`
    CREATE INDEX IF NOT EXISTS idx_prefecture_slug ON companies(prefecture_slug);
    CREATE INDEX IF NOT EXISTS idx_city_slug ON companies(city_slug);
    CREATE INDEX IF NOT EXISTS idx_company_name ON companies(company_name);
    CREATE INDEX IF NOT EXISTS idx_location ON companies(location);
    CREATE INDEX IF NOT EXISTS idx_corporate_number ON companies(corporate_number);
    CREATE INDEX IF NOT EXISTS idx_listing_status ON companies(listing_status);
    CREATE INDEX IF NOT EXISTS idx_ci_industry ON company_industries(industry_slug);
    CREATE INDEX IF NOT EXISTS idx_cities_pref ON cities(prefecture_slug);
  `);

  // --- FTS5 ---
  console.log('创建全文搜索索引...');
  try {
    await target.execute('DROP TABLE IF EXISTS companies_fts');
    await target.execute(`
      CREATE VIRTUAL TABLE companies_fts USING fts5(
        company_name, company_name_kana, summary, business_keywords,
        content=companies, content_rowid=rowid
      )
    `);
    await target.execute("INSERT INTO companies_fts(companies_fts) VALUES('rebuild')");
    console.log('  FTS5 索引创建成功');
  } catch (e) {
    console.log('  FTS5 不可用 (可能 libsql 版本不支持)，搜索将回退到 LIKE');
  }

  // --- Summary ---
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== 完成 (${elapsed}s) ===`);
  console.log(`企业: ${processed.toLocaleString()}`);
  console.log(`都道府県: ${prefCounts.size}`);
  console.log(`市区町村: ${cityCount}`);
  console.log(`行业: ${industryCounts.size}`);
  console.log(`交叉页: ${piCount}`);
  console.log(`\n本地数据库已保存到: ${TARGET_PATH}`);
  console.log('运行 npm run dev 即可启动');

  source.close();
  target.close();
}

main().catch(console.error);
