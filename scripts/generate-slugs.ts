// Run: npx tsx scripts/generate-slugs.ts
// Utility: reads local SQLite DB and reports on prefecture/industry slug coverage.
// Useful for verifying that the slug mapping in src/lib/slugs.ts is complete.

import { createClient } from '@libsql/client';
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

const SOURCE_DB_PATH = new URL('../../DB/companies_fixed.db', import.meta.url)
  .pathname;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== Slug Coverage Report ===');
  console.log(`Source: ${SOURCE_DB_PATH}`);
  console.log();

  const db = createClient({ url: `file:${SOURCE_DB_PATH}` });

  try {
    const countResult = await db.execute('SELECT COUNT(*) as cnt FROM companies');
    const totalRows = Number(countResult.rows[0].cnt);
    console.log(`Total records: ${totalRows.toLocaleString()}`);
    console.log();

    // -----------------------------------------------------------------------
    // Prefecture analysis
    // -----------------------------------------------------------------------
    console.log('=== PREFECTURE ANALYSIS ===');
    console.log();

    // Parse all locations
    const prefCounts = new Map<string, number>();      // slug -> count
    const unknownPrefCounts = new Map<string, number>(); // raw location prefix -> count
    let nullLocationCount = 0;
    let parsedPrefCount = 0;

    // City analysis
    const cityExamples = new Map<string, Set<string>>(); // prefSlug -> set of city names

    const PAGE_SIZE = 50_000;
    let offset = 0;

    while (offset < totalRows) {
      const result = await db.execute({
        sql: 'SELECT location FROM companies LIMIT ? OFFSET ?',
        args: [PAGE_SIZE, offset],
      });

      for (const row of result.rows) {
        const location = row.location as string | null;

        if (!location || location.trim() === '') {
          nullLocationCount++;
          continue;
        }

        const prefSlug = parsePrefectureFromLocation(location);

        if (prefSlug) {
          parsedPrefCount++;
          prefCounts.set(prefSlug, (prefCounts.get(prefSlug) ?? 0) + 1);

          // Try to extract city
          const cityName = parseCityFromLocation(location, prefSlug);
          if (cityName) {
            if (!cityExamples.has(prefSlug)) {
              cityExamples.set(prefSlug, new Set());
            }
            cityExamples.get(prefSlug)!.add(cityName);
          }
        } else {
          // Could not parse prefecture -- extract first few chars for diagnosis
          const prefix = location.slice(0, 10);
          unknownPrefCounts.set(prefix, (unknownPrefCounts.get(prefix) ?? 0) + 1);
        }
      }

      offset += PAGE_SIZE;
    }

    // Report: matched prefectures
    console.log('Matched Prefectures (sorted by company count):');
    console.log('-'.repeat(60));

    const sortedPrefs = Array.from(prefCounts.entries()).sort((a, b) => b[1] - a[1]);
    for (const [slug, count] of sortedPrefs) {
      const pref = PREFECTURES.find((p) => p.slug === slug);
      const nameJa = pref?.name_ja ?? '???';
      const cityCount = cityExamples.get(slug)?.size ?? 0;
      console.log(
        `  ${nameJa.padEnd(6)} (${slug.padEnd(12)})  ${count.toLocaleString().padStart(8)} companies  ${cityCount.toLocaleString().padStart(5)} cities`,
      );
    }

    console.log();
    console.log(`  TOTAL matched:     ${parsedPrefCount.toLocaleString()} / ${totalRows.toLocaleString()} (${((parsedPrefCount / totalRows) * 100).toFixed(1)}%)`);
    console.log(`  NULL/empty:        ${nullLocationCount.toLocaleString()}`);
    console.log(`  Unmatched:         ${(totalRows - parsedPrefCount - nullLocationCount).toLocaleString()}`);

    // Report: unmatched location prefixes
    if (unknownPrefCounts.size > 0) {
      console.log();
      console.log('Top 30 Unmatched Location Prefixes:');
      console.log('-'.repeat(60));

      const sortedUnknown = Array.from(unknownPrefCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30);

      for (const [prefix, count] of sortedUnknown) {
        console.log(`  "${prefix}"  ${count.toLocaleString().padStart(8)} records`);
      }
    }

    // Missing prefectures (defined in slugs but zero companies)
    const missingPrefs = PREFECTURES.filter((p) => !prefCounts.has(p.slug));
    if (missingPrefs.length > 0) {
      console.log();
      console.log('Prefectures with ZERO companies:');
      for (const p of missingPrefs) {
        console.log(`  ${p.name_ja} (${p.slug})`);
      }
    }

    // -----------------------------------------------------------------------
    // Industry analysis
    // -----------------------------------------------------------------------
    console.log();
    console.log('=== INDUSTRY TAG ANALYSIS ===');
    console.log();

    const matchedIndustries = new Map<string, number>();    // slug -> count
    const unknownIndustries = new Map<string, number>();     // raw tag -> count
    let totalTagsProcessed = 0;
    let totalTagsMatched = 0;
    let invalidJsonCount = 0;
    let nullTagsCount = 0;

    offset = 0;

    while (offset < totalRows) {
      const result = await db.execute({
        sql: 'SELECT industry_tags FROM companies LIMIT ? OFFSET ?',
        args: [PAGE_SIZE, offset],
      });

      for (const row of result.rows) {
        const raw = row.industry_tags as string | null;

        if (!raw || raw.trim() === '' || raw === '[]') {
          nullTagsCount++;
          continue;
        }

        try {
          const tags: unknown = JSON.parse(raw);
          if (!Array.isArray(tags)) {
            invalidJsonCount++;
            continue;
          }

          for (const tag of tags) {
            if (typeof tag !== 'string') continue;
            totalTagsProcessed++;

            const slug = INDUSTRY_BY_NAME.get(tag);
            if (slug) {
              totalTagsMatched++;
              matchedIndustries.set(slug, (matchedIndustries.get(slug) ?? 0) + 1);
            } else {
              unknownIndustries.set(tag, (unknownIndustries.get(tag) ?? 0) + 1);
            }
          }
        } catch {
          invalidJsonCount++;
        }
      }

      offset += PAGE_SIZE;
    }

    // Report: matched industries
    console.log('Matched Industries (sorted by company count):');
    console.log('-'.repeat(70));

    const sortedInds = Array.from(matchedIndustries.entries()).sort((a, b) => b[1] - a[1]);
    for (const [slug, count] of sortedInds) {
      const ind = INDUSTRIES.find((i) => i.slug === slug);
      const nameJa = ind?.name_ja ?? '???';
      console.log(
        `  ${nameJa.padEnd(30)} (${slug.padEnd(25)})  ${count.toLocaleString().padStart(8)}`,
      );
    }

    console.log();
    console.log(`  Tags processed:    ${totalTagsProcessed.toLocaleString()}`);
    console.log(`  Tags matched:      ${totalTagsMatched.toLocaleString()} (${((totalTagsMatched / Math.max(totalTagsProcessed, 1)) * 100).toFixed(1)}%)`);
    console.log(`  Tags unmatched:    ${(totalTagsProcessed - totalTagsMatched).toLocaleString()}`);
    console.log(`  NULL/empty tags:   ${nullTagsCount.toLocaleString()}`);
    console.log(`  Invalid JSON:      ${invalidJsonCount}`);

    // Report: unmatched industry tags
    if (unknownIndustries.size > 0) {
      console.log();
      console.log(`Unmatched Industry Tags (${unknownIndustries.size} unique, showing top 50):`,);
      console.log('-'.repeat(70));

      const sortedUnknownInd = Array.from(unknownIndustries.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50);

      for (const [tag, count] of sortedUnknownInd) {
        console.log(`  "${tag}"  ${count.toLocaleString().padStart(8)}`);
      }
    }

    // Missing industries (defined in slugs but zero matches)
    const missingInds = INDUSTRIES.filter((i) => !matchedIndustries.has(i.slug));
    if (missingInds.length > 0) {
      console.log();
      console.log('Industries with ZERO matches:');
      for (const ind of missingInds) {
        console.log(`  ${ind.name_ja} (${ind.slug})`);
      }
    }

    // -----------------------------------------------------------------------
    // City coverage summary
    // -----------------------------------------------------------------------
    console.log();
    console.log('=== CITY COVERAGE SUMMARY ===');
    console.log();

    let totalCities = 0;
    for (const [, cities] of Array.from(cityExamples)) {
      totalCities += cities.size;
    }
    console.log(`  Total unique cities found: ${totalCities.toLocaleString()}`);
    console.log(`  Across ${cityExamples.size} prefectures`);

    // Show top 5 prefectures by city count
    console.log();
    console.log('Top 10 prefectures by city count:');
    const sortedCityPrefs = Array.from(cityExamples.entries())
      .map(([slug, cities]) => ({ slug, count: cities.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    for (const { slug, count } of sortedCityPrefs) {
      const pref = PREFECTURES.find((p) => p.slug === slug);
      const examples = Array.from(cityExamples.get(slug) ?? []).slice(0, 5).join(', ');
      console.log(`  ${pref?.name_ja ?? slug} -- ${count} cities (e.g. ${examples})`);
    }

    console.log();
    console.log('=== Report complete ===');
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error('Report generation failed:', err);
  process.exit(1);
});
