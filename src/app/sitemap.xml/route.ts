// ---------------------------------------------------------------------------
// Sitemap Index — /sitemap.xml
// Points to child sitemaps: areas, industries, and company batches
// ---------------------------------------------------------------------------

import db from '@/lib/db';

export const revalidate = 86400;

const BATCH_SIZE = 50000;

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
}

export async function GET(): Promise<Response> {
  const baseUrl = getBaseUrl();

  // Get total company count to calculate number of company sitemap files
  const result = await db.execute(
    "SELECT COUNT(*) as count FROM companies WHERE company_name IS NOT NULL AND company_name != ''",
  );
  const totalCompanies = Number(result.rows[0].count);
  const totalBatches = Math.ceil(totalCompanies / BATCH_SIZE);

  const sitemaps: string[] = [];

  // Areas sitemap (prefectures + cities)
  sitemaps.push(`  <sitemap><loc>${escapeXml(baseUrl)}/sitemap/areas.xml</loc></sitemap>`);

  // Industries sitemap (industries + cross pages)
  sitemaps.push(`  <sitemap><loc>${escapeXml(baseUrl)}/sitemap/industries.xml</loc></sitemap>`);

  // Company sitemaps (batches of 50K)
  for (let i = 1; i <= totalBatches; i++) {
    sitemaps.push(`  <sitemap><loc>${escapeXml(baseUrl)}/sitemap/companies-${i}.xml</loc></sitemap>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}

/**
 * Escape special XML characters in a string.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
