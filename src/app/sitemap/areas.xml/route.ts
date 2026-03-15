// ---------------------------------------------------------------------------
// Areas Sitemap — /sitemap/areas.xml
// Contains all prefecture and city page URLs
// ---------------------------------------------------------------------------

import { getAllPrefectures, getCitiesByPrefecture } from '@/lib/queries';

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

  const prefectures = await getAllPrefectures();
  const urls: string[] = [];

  // Add prefecture page URLs
  for (const pref of prefectures) {
    urls.push(
      `  <url>
    <loc>${escapeXml(baseUrl)}/${escapeXml(pref.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    );
  }

  // For each prefecture, fetch cities and add city page URLs
  const cityResults = await Promise.all(
    prefectures.map((pref) => getCitiesByPrefecture(pref.slug)),
  );

  for (let i = 0; i < prefectures.length; i++) {
    const prefSlug = prefectures[i].slug;
    const cities = cityResults[i];

    for (const city of cities) {
      urls.push(
        `  <url>
    <loc>${escapeXml(baseUrl)}/${escapeXml(prefSlug)}/${escapeXml(encodeURIComponent(city.slug))}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
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
