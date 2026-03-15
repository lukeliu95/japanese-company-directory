// ---------------------------------------------------------------------------
// SEO utility functions — metadata generators, JSON-LD, formatting
// ---------------------------------------------------------------------------

const SITE_NAME = 'GBase GTM';

// ---------------------------------------------------------------------------
// Metadata generators
// ---------------------------------------------------------------------------

export function companyMeta(company: {
  company_name: string | null;
  location: string | null;
  summary: string | null;
  established_date: string | null;
  capital: string | null;
}): { title: string; description: string } {
  const name = company.company_name ?? '企業情報';
  const title = `${name} - 会社概要・企業情報 | ${SITE_NAME}`;

  const parts: string[] = [];
  parts.push(`${name}は`);
  if (company.location) {
    parts.push(`${company.location}の企業。`);
  } else {
    parts.push('日本の企業。');
  }
  if (company.summary) {
    const trimmed =
      company.summary.length > 80
        ? company.summary.slice(0, 80) + '...'
        : company.summary;
    parts.push(trimmed);
    if (!trimmed.endsWith('。') && !trimmed.endsWith('...')) {
      parts.push('。');
    }
  }

  const description = parts.join('');

  return { title, description };
}

export function prefectureMeta(
  name_ja: string,
  count: number,
): { title: string; description: string } {
  const formatted = formatCount(count);
  return {
    title: `${name_ja}の企業一覧 - ${formatted}社掲載 | ${SITE_NAME}`,
    description: `${name_ja}に所在する企業${formatted}社の一覧。業界別・市区町村別に検索可能。`,
  };
}

export function cityMeta(
  prefectureName: string,
  cityName: string,
  count: number,
): { title: string; description: string } {
  const formatted = formatCount(count);
  return {
    title: `${prefectureName}${cityName}の企業一覧 - ${formatted}社掲載 | ${SITE_NAME}`,
    description: `${prefectureName}${cityName}に所在する企業${formatted}社の一覧。業界別に検索可能。`,
  };
}

export function industryMeta(
  name_ja: string,
  count: number,
): { title: string; description: string } {
  const formatted = formatCount(count);
  return {
    title: `${name_ja}の企業一覧 - ${formatted}社掲載 | ${SITE_NAME}`,
    description: `${name_ja}に属する企業${formatted}社の一覧。都道府県別に検索可能。`,
  };
}

export function crossMeta(
  prefectureName: string,
  industryName: string,
  count: number,
): { title: string; description: string } {
  const formatted = formatCount(count);
  return {
    title: `${prefectureName}の${industryName}企業一覧 - ${formatted}社 | ${SITE_NAME}`,
    description: `${prefectureName}に所在する${industryName}企業${formatted}社の一覧。`,
  };
}

// ---------------------------------------------------------------------------
// Number formatting
// ---------------------------------------------------------------------------

/**
 * Format a number with commas for display.
 * Example: 904744 -> "904,744"
 */
export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

// ---------------------------------------------------------------------------
// JSON-LD generators
// ---------------------------------------------------------------------------

export function organizationJsonLd(company: {
  company_name: string | null;
  address: string | null;
  established_date: string | null;
  employees: string | null;
  page_url: string | null;
  representative_name: string | null;
}): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
  };

  if (company.company_name) {
    jsonLd.name = company.company_name;
  }

  if (company.address) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      streetAddress: company.address,
      addressCountry: 'JP',
    };
  }

  if (company.established_date) {
    jsonLd.foundingDate = company.established_date;
  }

  if (company.employees) {
    jsonLd.numberOfEmployees = {
      '@type': 'QuantitativeValue',
      value: company.employees,
    };
  }

  if (company.page_url) {
    jsonLd.url = company.page_url;
  }

  if (company.representative_name) {
    jsonLd.founder = {
      '@type': 'Person',
      name: company.representative_name,
    };
  }

  return jsonLd;
}

export function itemListJsonLd(
  items: { company_id: string; company_name: string | null }[],
  pageUrl: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    url: pageUrl,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.company_name ?? '企業',
      url: `${pageUrl.replace(/\/[^/]*$/, '')}/company/${item.company_id}`,
    })),
  };
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function websiteJsonLd(siteUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
