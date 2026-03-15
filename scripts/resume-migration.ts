// Resume migration: finish company_industries + auxiliary tables
import { createClient, type InStatement } from '@libsql/client';
import {
  PREFECTURES,
  INDUSTRIES,
  INDUSTRY_BY_NAME,
  parsePrefectureFromLocation,
} from '../src/lib/slugs';

const BATCH_SIZE = 500;

const sourceDb = createClient({ url: 'file:../DB/companies_fixed.db' });
const targetDb = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // Check current state
  const ciCount = Number((await targetDb.execute('SELECT COUNT(*) as n FROM company_industries')).rows[0].n);
  console.log(`company_industries 已有: ${ciCount.toLocaleString()}`);

  // Step 1: Finish company_industries
  console.log('\n=== 补完 company_industries ===');
  const totalCompanies = Number((await sourceDb.execute('SELECT COUNT(*) as cnt FROM companies')).rows[0].cnt);

  // Collect ALL company_industries from source
  const allCI: { companyId: string; industrySlug: string }[] = [];
  const prefCounts = new Map<string, number>();
  const cityCounts = new Map<string, { name: string; count: number }>();
  const industryCounts = new Map<string, number>();
  const prefIndustryCounts = new Map<string, number>();

  for (let offset = 0; offset < totalCompanies; offset += 10000) {
    const page = await sourceDb.execute({
      sql: 'SELECT company_id, location, industry_tags FROM companies LIMIT ? OFFSET ?',
      args: [10000, offset],
    });
    for (const row of page.rows) {
      const companyId = row.company_id as string;
      const location = (row.location as string) || '';
      const prefSlug = parsePrefectureFromLocation(location);

      // Count for auxiliary tables
      if (prefSlug) {
        prefCounts.set(prefSlug, (prefCounts.get(prefSlug) || 0) + 1);
        const prefEntry = PREFECTURES.find(p => p.slug === prefSlug);
        if (prefEntry) {
          const idx = location.indexOf(prefEntry.name_ja);
          if (idx !== -1) {
            const cityName = location.slice(idx + prefEntry.name_ja.length).trim();
            if (cityName) {
              const cityKey = `${prefSlug}::${cityName}`;
              const existing = cityCounts.get(cityKey);
              if (existing) existing.count++;
              else cityCounts.set(cityKey, { name: cityName, count: 1 });
            }
          }
        }
      }

      const rawTags = row.industry_tags as string;
      if (rawTags) {
        try {
          const tags = JSON.parse(rawTags);
          if (Array.isArray(tags)) {
            for (const tag of tags) {
              const slug = INDUSTRY_BY_NAME.get(tag);
              if (slug) {
                allCI.push({ companyId, industrySlug: slug });
                industryCounts.set(slug, (industryCounts.get(slug) || 0) + 1);
                if (prefSlug) {
                  const piKey = `${prefSlug}::${slug}`;
                  prefIndustryCounts.set(piKey, (prefIndustryCounts.get(piKey) || 0) + 1);
                }
              }
            }
          }
        } catch {}
      }
    }
    if ((offset + 10000) % 100000 === 0) {
      console.log(`  扫描: ${(offset + 10000).toLocaleString()} / ${totalCompanies.toLocaleString()}`);
    }
  }

  console.log(`  源数据 company_industries 总数: ${allCI.length.toLocaleString()}`);

  // Insert missing CI records (skip first ciCount that already exist)
  const toInsert = allCI.slice(ciCount);
  console.log(`  需要补插: ${toInsert.length.toLocaleString()}`);

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const chunk = toInsert.slice(i, i + BATCH_SIZE);
    try {
      await targetDb.batch(
        chunk.map(ci => ({
          sql: 'INSERT OR IGNORE INTO company_industries VALUES (?, ?)',
          args: [ci.companyId, ci.industrySlug],
        })),
        'write',
      );
      inserted += chunk.length;
      if (inserted % 50000 === 0) {
        console.log(`  company_industries: +${inserted.toLocaleString()}`);
      }
    } catch (e: any) {
      console.error(`  写入被阻断: ${e.message}`);
      console.log(`  已补插: ${inserted.toLocaleString()}`);
      break;
    }
  }
  console.log(`  company_industries 补完: +${inserted.toLocaleString()}`);

  // Step 2: Auxiliary tables
  console.log('\n=== 写入辅助表 ===');

  // Prefectures
  const prefBatch: InStatement[] = [];
  for (const [slug, count] of prefCounts) {
    const entry = PREFECTURES.find(p => p.slug === slug);
    prefBatch.push({ sql: 'INSERT OR REPLACE INTO prefectures VALUES (?, ?, ?)', args: [slug, entry?.name_ja || slug, count] });
  }
  await targetDb.batch(prefBatch, 'write');
  console.log(`  prefectures: ${prefCounts.size}`);

  // Cities
  let cityBatch: InStatement[] = [];
  for (const [key, data] of cityCounts) {
    const [prefSlug] = key.split('::');
    cityBatch.push({ sql: 'INSERT OR REPLACE INTO cities VALUES (?, ?, ?, ?)', args: [data.name, data.name, prefSlug, data.count] });
    if (cityBatch.length >= BATCH_SIZE) {
      await targetDb.batch(cityBatch, 'write');
      cityBatch = [];
    }
  }
  if (cityBatch.length > 0) await targetDb.batch(cityBatch, 'write');
  console.log(`  cities: ${cityCounts.size}`);

  // Industries
  const indBatch: InStatement[] = [];
  for (const ind of INDUSTRIES) {
    const count = industryCounts.get(ind.slug) || 0;
    if (count > 0) {
      indBatch.push({ sql: 'INSERT OR REPLACE INTO industries VALUES (?, ?, ?)', args: [ind.slug, ind.name_ja, count] });
    }
  }
  await targetDb.batch(indBatch, 'write');
  console.log(`  industries: ${indBatch.length}`);

  // Prefecture-industries (min 10)
  let piBatch: InStatement[] = [];
  let piCount = 0;
  for (const [key, count] of prefIndustryCounts) {
    if (count < 10) continue;
    const [prefSlug, indSlug] = key.split('::');
    piBatch.push({ sql: 'INSERT OR REPLACE INTO prefecture_industries VALUES (?, ?, ?)', args: [prefSlug, indSlug, count] });
    piCount++;
    if (piBatch.length >= BATCH_SIZE) {
      await targetDb.batch(piBatch, 'write');
      piBatch = [];
    }
  }
  if (piBatch.length > 0) await targetDb.batch(piBatch, 'write');
  console.log(`  prefecture_industries: ${piCount}`);

  // Step 3: FTS5
  console.log('\n=== FTS5 索引 ===');
  try {
    await targetDb.execute('DROP TABLE IF EXISTS companies_fts');
    await targetDb.execute(`CREATE VIRTUAL TABLE companies_fts USING fts5(company_name, company_name_kana, summary, business_keywords, content=companies, content_rowid=rowid)`);
    await targetDb.execute("INSERT INTO companies_fts(companies_fts) VALUES('rebuild')");
    console.log('  FTS5 创建成功');
  } catch (e: any) {
    console.log(`  FTS5 跳过: ${e.message}`);
  }

  // Verify
  console.log('\n=== 验证 ===');
  const [c, ci, p, ct, ind, pi] = await Promise.all([
    targetDb.execute('SELECT COUNT(*) as n FROM companies'),
    targetDb.execute('SELECT COUNT(*) as n FROM company_industries'),
    targetDb.execute('SELECT COUNT(*) as n FROM prefectures'),
    targetDb.execute('SELECT COUNT(*) as n FROM cities'),
    targetDb.execute('SELECT COUNT(*) as n FROM industries'),
    targetDb.execute('SELECT COUNT(*) as n FROM prefecture_industries'),
  ]);
  console.log(`companies: ${c.rows[0].n}`);
  console.log(`company_industries: ${ci.rows[0].n}`);
  console.log(`prefectures: ${p.rows[0].n}`);
  console.log(`cities: ${ct.rows[0].n}`);
  console.log(`industries: ${ind.rows[0].n}`);
  console.log(`prefecture_industries: ${pi.rows[0].n}`);
  console.log('\n完成!');

  sourceDb.close();
  targetDb.close();
}

main().catch(console.error);
