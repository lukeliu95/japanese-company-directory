import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompanyById } from '@/lib/queries';
import {
  PREFECTURE_BY_SLUG,
  INDUSTRY_BY_NAME,
} from '@/lib/slugs';
import Breadcrumb from '@/components/Breadcrumb';
import JsonLd from '@/components/JsonLd';

export const revalidate = 604800;

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

// --- Metadata ---
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const company = await getCompanyById(id);
  if (!company || !company.company_name) return { title: '企業が見つかりません' };

  const name = company.company_name ?? '企業詳細';
  const loc = company.location ?? '';
  const parts: string[] = [];
  if (loc) parts.push(loc);
  if (company.established_date) parts.push(`設立${company.established_date}`);
  if (company.capital) parts.push(`資本金${company.capital}`);

  const desc = company.summary
    ? `${name}の企業情報。${company.summary.slice(0, 100)}。${parts.join('・')}。`
    : `${name}の企業情報。${parts.join('・')}。会社概要・業界・所在地を掲載。`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://japanese-company-directory.vercel.app';
  const locSuffix = loc ? `(${loc})` : '';
  return {
    title: `${name}${locSuffix} - 会社概要・企業情報`,
    description: desc.slice(0, 160),
    alternates: { canonical: `${siteUrl}/company/${id}` },
    openGraph: {
      title: `${name}${locSuffix} - 会社概要・企業情報 | GBase GTM`,
      description: desc.slice(0, 120),
      type: 'website',
      locale: 'ja_JP',
    },
  };
}

// --- Page ---
export default async function CompanyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const company = await getCompanyById(id);
  if (!company || !company.company_name) notFound();

  const industryTags = parseJsonArray(company.industry_tags);
  const features = parseJsonArray(company.features);
  const businessKeywords = parseJsonArray(company.business_keywords);
  const offices = parseJsonArray(company.offices_info);
  const prefectureName = company.prefecture_slug
    ? PREFECTURE_BY_SLUG.get(company.prefecture_slug)
    : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://japanese-company-directory.vercel.app';

  // Breadcrumb
  const crumbs: { label: string; href?: string }[] = [
    { label: 'ホーム', href: '/' },
  ];
  if (company.prefecture_slug && prefectureName) {
    crumbs.push({ label: prefectureName, href: `/${company.prefecture_slug}` });
  }
  if (company.prefecture_slug && company.city_slug) {
    crumbs.push({
      label: company.city_slug,
      href: `/${company.prefecture_slug}/${encodeURIComponent(company.city_slug)}`,
    });
  }
  crumbs.push({ label: company.company_name ?? '企業詳細' });

  // Stats for the stat bar
  const stats: { value: string; label: string }[] = [];
  if (company.revenue) stats.push({ value: company.revenue, label: '売上高' });
  if (company.capital) stats.push({ value: company.capital, label: '資本金' });
  if (company.employees) stats.push({ value: company.employees, label: '従業員数' });
  else stats.push({ value: '-', label: '従業員数' });
  if (company.established_date)
    stats.push({ value: company.established_date, label: '設立' });

  // FAQ auto-generation for SEO
  const name = company.company_name ?? '企業';
  const faqs: { q: string; a: string }[] = [];
  if (company.location) {
    faqs.push({
      q: `${name}の本社所在地は？`,
      a: `${company.address ?? company.location}にあります。`,
    });
  }
  if (company.established_date) {
    faqs.push({
      q: `${name}の設立年は？`,
      a: `${company.established_date}に設立されました。`,
    });
  }
  if (company.capital) {
    faqs.push({
      q: `${name}の資本金は？`,
      a: `資本金は${company.capital}です。`,
    });
  }
  if (company.representative_name) {
    faqs.push({
      q: `${name}の代表者は？`,
      a: `${company.representative_name}です。`,
    });
  }
  if (industryTags.length > 0) {
    faqs.push({
      q: `${name}の業種は？`,
      a: `${industryTags.slice(0, 3).join('、')}に分類されます。`,
    });
  }

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/company/${company.company_id}#organization`,
        name: company.company_name,
        ...(company.company_name_en && { alternateName: company.company_name_en }),
        url: `${siteUrl}/company/${company.company_id}`,
        ...(company.description && { description: company.description.slice(0, 300) }),
        ...(company.address && {
          address: {
            '@type': 'PostalAddress',
            streetAddress: company.address,
            addressCountry: 'JP',
            ...(prefectureName && { addressRegion: prefectureName }),
          },
        }),
        ...(company.established_date && { foundingDate: company.established_date }),
        ...(company.corporate_number && { taxID: company.corporate_number }),
        ...(company.representative_name && {
          founder: { '@type': 'Person', name: company.representative_name },
        }),
      },
      ...(faqs.length > 0
        ? [
            {
              '@type': 'FAQPage',
              mainEntity: faqs.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <JsonLd data={jsonLd} />

      {/* ── HERO ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 pt-6 pb-5 sm:px-6">
          <Breadcrumb items={crumbs} />

          <div className="mt-4 flex items-start gap-5">
            {/* Company initial avatar */}
            <div className="hidden sm:flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">
              <span className="text-2xl font-extrabold text-blue-700">
                {(company.company_name ?? '?')[0]}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold text-gray-900 leading-tight sm:text-2xl">
                {company.company_name ?? '企業詳細'}
              </h1>
              {company.company_name_en && (
                <p className="mt-0.5 text-xs text-gray-400">{company.company_name_en}</p>
              )}

              {/* Meta chips */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-600">
                {company.location && (
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    {company.location}
                  </span>
                )}
                {company.established_date && (
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {company.established_date}
                  </span>
                )}
                {company.listing_status && (
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
                    {company.listing_status}
                  </span>
                )}
              </div>

              {/* Industry tags */}
              {industryTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {industryTags.slice(0, 5).map((tag) => {
                    const slug = INDUSTRY_BY_NAME.get(tag);
                    return slug ? (
                      <Link
                        key={tag}
                        href={`/${slug}`}
                        className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        {tag.replace('業界の会社', '').replace('の会社', '')}
                      </Link>
                    ) : (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                      >
                        {tag.replace('業界の会社', '').replace('の会社', '')}
                      </span>
                    );
                  })}
                  {features.length > 0 &&
                    features.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                      >
                        {f}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* LEFT COLUMN (2/3) */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Stats bar */}
            {stats.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
                  {stats.map((s, i) => (
                    <div key={i} className="px-4 py-4 text-center">
                      <div className="text-lg font-extrabold text-gray-900 leading-none">
                        {s.value}
                      </div>
                      <div className="mt-1.5 text-[11px] font-medium text-gray-400">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Company info card */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
                  <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                </div>
                <h2 className="text-sm font-bold text-gray-900">基本情報</h2>
              </div>
              <div className="divide-y divide-gray-50">
                <InfoRow label="会社名" value={company.company_name} />
                {company.company_name_en && (
                  <InfoRow label="英語名" value={company.company_name_en} />
                )}
                {company.company_name_kana && (
                  <InfoRow label="かな" value={company.company_name_kana} />
                )}
                <InfoRow
                  label="所在地"
                  value={
                    company.address ?? company.location ?? null
                  }
                  link={
                    company.prefecture_slug
                      ? {
                          text: prefectureName ?? '',
                          href: `/${company.prefecture_slug}`,
                        }
                      : undefined
                  }
                />
                <InfoRow label="代表者" value={company.representative_name} />
                <InfoRow label="設立" value={company.established_date} />
                <InfoRow label="資本金" value={company.capital} />
                {company.revenue && (
                  <InfoRow
                    label="売上高"
                    value={
                      company.revenue +
                      (company.revenue_growth
                        ? ` (前年比: ${company.revenue_growth})`
                        : '')
                    }
                  />
                )}
                {company.employees && (
                  <InfoRow
                    label="従業員数"
                    value={
                      company.employees +
                      (company.employee_growth
                        ? ` (増減: ${company.employee_growth})`
                        : '')
                    }
                  />
                )}
                <InfoRow label="法人番号" value={company.corporate_number} mono />
                {company.listing_status && (
                  <InfoRow
                    label="上場区分"
                    value={
                      company.listing_status +
                      (company.listing_market
                        ? ` (${company.listing_market})`
                        : '') +
                      (company.securities_code
                        ? ` 証券コード: ${company.securities_code}`
                        : '')
                    }
                  />
                )}
                {company.fiscal_month && (
                  <InfoRow label="決算月" value={`${company.fiscal_month}月`} />
                )}
                {company.office_count && (
                  <InfoRow
                    label="拠点数"
                    value={
                      company.office_count +
                      (company.factory_count
                        ? ` (うち工場: ${company.factory_count})`
                        : '')
                    }
                  />
                )}
                {company.new_grad_hires && (
                  <InfoRow label="新卒採用数" value={company.new_grad_hires} />
                )}
                {company.company_name && (
                  <InfoRow
                    label="詳細情報"
                    value="GBaseで詳細を見る →"
                    href={`https://s.gbase.ai/?q=${encodeURIComponent(company.company_name)}`}
                    isLink
                  />
                )}
              </div>
            </div>

            {/* About section */}
            {(company.summary || company.description) && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
                    <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    {name}について
                  </h2>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {company.summary && (
                    <p className="text-sm leading-relaxed text-gray-700">
                      {company.summary}
                    </p>
                  )}
                  {company.description && company.description !== company.summary && (
                    <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                      {company.description}
                    </p>
                  )}
                </div>

                {/* Business keywords */}
                {businessKeywords.length > 0 && (
                  <>
                    <div className="border-t border-gray-100 px-5 pt-3 pb-1">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        事業キーワード
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-5 pb-4">
                      {businessKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="rounded-md bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Offices */}
            {offices.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
                    <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    拠点情報
                  </h2>
                  <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    {offices.length}拠点
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {offices.slice(0, 10).map((office, i) => (
                    <div key={i} className="px-5 py-2.5 text-sm text-gray-600">
                      {office}
                    </div>
                  ))}
                  {offices.length > 10 && (
                    <div className="px-5 py-2 text-xs text-gray-400">
                      他 {offices.length - 10} 拠点
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FAQ for SEO */}
            {faqs.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
                    <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">よくある質問</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {faqs.map((faq, i) => (
                    <div key={i} className="px-5 py-3.5">
                      <h3 className="text-sm font-semibold text-gray-800">
                        {faq.q}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR (1/3) */}
          <div className="flex flex-col gap-5">
            {/* Representative card */}
            {company.representative_name && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-sm font-bold text-gray-900">代表者</h3>
                </div>
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-extrabold text-white">
                    {company.representative_name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {company.representative_name}
                    </div>
                    <div className="text-xs text-gray-400">代表取締役</div>
                  </div>
                </div>
              </div>
            )}

            {/* Key stats sidebar */}
            {stats.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-sm font-bold text-gray-900">主要指標</h3>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-100">
                  {stats.slice(0, 4).map((s, i) => (
                    <div
                      key={i}
                      className={`px-4 py-3.5 ${i < 2 ? 'border-b border-gray-100' : ''}`}
                    >
                      <div className="text-base font-extrabold text-gray-900">{s.value}</div>
                      <div className="mt-0.5 text-[11px] text-gray-400 font-medium">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Industry tags sidebar */}
            {industryTags.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-sm font-bold text-gray-900">業界分類</h3>
                </div>
                <div className="flex flex-wrap gap-1.5 px-5 py-4">
                  {industryTags.map((tag) => {
                    const slug = INDUSTRY_BY_NAME.get(tag);
                    const label = tag.replace('業界の会社', '').replace('の会社', '');
                    return slug ? (
                      <Link
                        key={tag}
                        href={`/${slug}`}
                        className="rounded-md bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        {label}
                      </Link>
                    ) : (
                      <span
                        key={tag}
                        className="rounded-md bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs text-gray-600"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location link */}
            {company.prefecture_slug && prefectureName && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-sm font-bold text-gray-900">所在エリア</h3>
                </div>
                <div className="px-5 py-4 space-y-2">
                  <Link
                    href={`/${company.prefecture_slug}`}
                    className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {prefectureName}の企業一覧
                  </Link>
                  {company.city_slug && (
                    <Link
                      href={`/${company.prefecture_slug}/${encodeURIComponent(company.city_slug)}`}
                      className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {prefectureName}{company.city_slug}の企業一覧
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Last updated */}
        {company.last_updated && (
          <p className="mt-8 text-center text-xs text-gray-400">
            最終更新: {company.last_updated}
          </p>
        )}
      </div>
    </div>
  );
}

// --- InfoRow component ---
function InfoRow({
  label,
  value,
  mono,
  link,
  isLink,
  href,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  link?: { text: string; href: string };
  isLink?: boolean;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-4 px-5 py-2.5 odd:bg-gray-50/50">
      <dt className="w-24 shrink-0 text-xs font-semibold text-gray-400 pt-0.5">
        {label}
      </dt>
      <dd className={`text-sm text-gray-700 ${mono ? 'font-mono' : ''}`}>
        {link && (
          <>
            <Link
              href={link.href}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {link.text}
            </Link>
            {' '}
          </>
        )}
        {isLink ? (
          <a
            href={href ?? value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline break-all"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
