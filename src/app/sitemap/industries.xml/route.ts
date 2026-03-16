// ---------------------------------------------------------------------------
// Industries Sitemap — /sitemap/industries.xml
// Contains all industry page URLs and cross (prefecture x industry) page URLs
// ---------------------------------------------------------------------------

import { getAllIndustries } from '@/lib/queries';
import { PREFECTURES } from '@/lib/slugs';

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

  // Fetch all industries with counts
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

  // Add prefecture × industry cross page URLs (all combinations with data)
  for (const pref of PREFECTURES) {
    for (const industry of industries) {
      urls.push(
        `  <url>
    <loc>${escapeXml(baseUrl)}/${escapeXml(pref.slug)}/${escapeXml(industry.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`,
      );
    }
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
