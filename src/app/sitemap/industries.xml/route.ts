// ---------------------------------------------------------------------------
// Industries Sitemap — /sitemap/industries.xml
// Contains all industry page URLs and cross (prefecture x industry) page URLs
// ---------------------------------------------------------------------------

import { getAllIndustries } from '@/lib/queries';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
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

export async function GET(): Promise<Response> {
  const baseUrl = getBaseUrl();

  const urls: string[] = [];

  // Fetch all industries
  const industries = await getAllIndustries();

  // Add industry page URLs
  for (const industry of industries) {
    urls.push(
      `  <url>
    <loc>${escapeXml(baseUrl)}/${escapeXml(industry.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
    );
  }

  // Fetch all cross pages from prefecture_industries table
  const crossResult = await db.execute(
    'SELECT prefecture_slug, industry_slug FROM prefecture_industries',
  );

  for (const row of crossResult.rows) {
    const prefSlug = row.prefecture_slug as string;
    const indSlug = row.industry_slug as string;
    urls.push(
      `  <url>
    <loc>${escapeXml(baseUrl)}/${escapeXml(prefSlug)}/${escapeXml(indSlug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`,
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
