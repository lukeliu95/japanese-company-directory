// ---------------------------------------------------------------------------
// Dynamic Company Sitemaps — /sitemap/companies-{N}.xml
// Each file contains up to 50,000 company URLs
// ---------------------------------------------------------------------------

import db from '@/lib/db';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

const BATCH_SIZE = 50000;

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;

  // Validate filename pattern: companies-{N}.xml where N >= 1
  const match = file.match(/^companies-(\d+)\.xml$/);
  if (!match) {
    return new Response('Not Found', { status: 404 });
  }

  const batchNumber = parseInt(match[1], 10);
  if (batchNumber < 1) {
    return new Response('Not Found', { status: 404 });
  }

  // Verify the batch number is within valid range
  const countResult = await db.execute(
    "SELECT COUNT(*) as count FROM companies WHERE company_name IS NOT NULL AND company_name != ''",
  );
  const totalCompanies = Number(countResult.rows[0].count);
  const totalBatches = Math.ceil(totalCompanies / BATCH_SIZE);

  if (batchNumber > totalBatches) {
    return new Response('Not Found', { status: 404 });
  }

  const baseUrl = getBaseUrl();
  const offset = (batchNumber - 1) * BATCH_SIZE;

  // Fetch company IDs for this batch
  const result = await db.execute({
    sql: "SELECT company_id, last_updated FROM companies WHERE company_name IS NOT NULL AND company_name != '' LIMIT ? OFFSET ?",
    args: [BATCH_SIZE, offset],
  });

  const urls: string[] = [];

  for (const row of result.rows) {
    const companyId = row.company_id as string;
    const lastMod = row.last_updated as string | null;
    // Convert "2025年05月12日" to "2025-05-12" format
    const lastModISO = lastMod?.match(/(\d{4})年(\d{2})月(\d{2})日/)
      ? `${RegExp.$1}-${RegExp.$2}-${RegExp.$3}`
      : null;
    urls.push(
      `  <url>
    <loc>${escapeXml(baseUrl)}/company/${escapeXml(companyId)}</loc>${lastModISO ? `\n    <lastmod>${lastModISO}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
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
