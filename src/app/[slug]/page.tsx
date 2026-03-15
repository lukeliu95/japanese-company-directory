import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getCompaniesByPrefecture,
  getCompaniesByIndustry,
  getCitiesByPrefecture,
  getIndustriesByPrefecture,
  getAllPrefectures,
} from '@/lib/queries';
import {
  PREFECTURE_SLUGS,
  PREFECTURE_BY_SLUG,
  INDUSTRY_BY_SLUG,
  PREFECTURES,
  INDUSTRIES,
} from '@/lib/slugs';
import CompanyTable from '@/components/CompanyTable';
import Pagination from '@/components/Pagination';
import Breadcrumb from '@/components/Breadcrumb';
import IndustryList from '@/components/IndustryList';
import JsonLd from '@/components/JsonLd';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

// ---- Metadata ----
export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Number(sp?.page) || 1;

  const isPrefecture = PREFECTURE_SLUGS.has(slug);
  const industryName = INDUSTRY_BY_SLUG.get(slug);

  if (isPrefecture) {
    const prefectureName = PREFECTURE_BY_SLUG.get(slug) ?? slug;
    const title =
      page > 1
        ? `${prefectureName}の企業一覧 (${page}ページ目)`
        : `${prefectureName}の企業一覧`;
    return {
      title,
      description: `${prefectureName}に所在する企業の一覧です。市区町村・業界別に検索できます。`,
      ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
      alternates: {
        canonical: `/${slug}`,
      },
    };
  }

  if (industryName) {
    const title =
      page > 1 ? `${industryName} (${page}ページ目)` : industryName;
    return {
      title,
      description: `${industryName}の企業一覧です。都道府県別に企業を検索できます。`,
      ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
      alternates: {
        canonical: `/${slug}`,
      },
    };
  }

  return { title: 'ページが見つかりません' };
}

// ---- Page component ----
export default async function SlugPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Number(sp?.page) || 1;

  const isPrefecture = PREFECTURE_SLUGS.has(slug);
  const industryName = INDUSTRY_BY_SLUG.get(slug);

  if (isPrefecture) {
    return <PrefecturePage slug={slug} page={page} />;
  }

  if (industryName) {
    return <IndustryPage slug={slug} page={page} />;
  }

  notFound();
}

// =====================================================================
// Prefecture page
// =====================================================================
async function PrefecturePage({
  slug,
  page,
}: {
  slug: string;
  page: number;
}) {
  const prefectureName = PREFECTURE_BY_SLUG.get(slug) ?? slug;

  const [companiesResult, cities, industries] = await Promise.all([
    getCompaniesByPrefecture(slug, page),
    getCitiesByPrefecture(slug),
    getIndustriesByPrefecture(slug),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

  const breadcrumbItems = [
    { label: 'ホーム', href: '/' },
    { label: prefectureName },
  ];

  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${prefectureName}の企業一覧`,
    numberOfItems: companiesResult.total,
    itemListElement: companiesResult.items.map((company, index) => ({
      '@type': 'ListItem',
      position: (page - 1) * 50 + index + 1,
      name: company.company_name,
      url: `${siteUrl}/company/${company.company_id}`,
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd data={jsonLdData} />
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        {prefectureName}の企業一覧
      </h1>
      <p className="mb-8 text-sm text-slate-500">
        {companiesResult.total.toLocaleString()}社の企業が見つかりました
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="order-2 lg:order-1 lg:col-span-1">
          {/* City list */}
          {cities.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-base font-semibold text-slate-800">
                市区町村から探す
              </h2>
              <div className="rounded-lg border border-slate-200 bg-white">
                <ul className="divide-y divide-slate-100" role="list">
                  {cities.map((city) => (
                    <li key={city.slug}>
                      <Link
                        href={`/${slug}/${encodeURIComponent(city.slug)}`}
                        className="flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-slate-50"
                      >
                        <span className="text-slate-700">
                          {city.name_ja}
                        </span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          {city.company_count.toLocaleString()}社
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Industry breakdown */}
          {industries.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-slate-800">
                業界から探す
              </h2>
              <div className="rounded-lg border border-slate-200 bg-white">
                <IndustryList
                  industries={industries}
                  prefectureSlug={slug}
                />
              </div>
            </section>
          )}
        </div>

        {/* Company table */}
        <div className="order-1 lg:order-2 lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <CompanyTable companies={companiesResult.items} />
          </div>
          <Pagination
            currentPage={page}
            totalPages={companiesResult.totalPages}
            basePath={`/${slug}`}
          />
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Industry page
// =====================================================================
async function IndustryPage({
  slug,
  page,
}: {
  slug: string;
  page: number;
}) {
  const industryName = INDUSTRY_BY_SLUG.get(slug) ?? slug;

  const [companiesResult, prefectures] = await Promise.all([
    getCompaniesByIndustry(slug, page),
    getAllPrefectures(),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

  const breadcrumbItems = [
    { label: 'ホーム', href: '/' },
    { label: industryName },
  ];

  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: industryName,
    numberOfItems: companiesResult.total,
    itemListElement: companiesResult.items.map((company, index) => ({
      '@type': 'ListItem',
      position: (page - 1) * 50 + index + 1,
      name: company.company_name,
      url: `${siteUrl}/company/${company.company_id}`,
    })),
  };

  // Prefectures with resolved names
  const prefecturesWithNames = prefectures.map((p) => ({
    ...p,
    name_ja: PREFECTURE_BY_SLUG.get(p.slug) ?? p.slug,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd data={jsonLdData} />
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        {industryName}
      </h1>
      <p className="mb-8 text-sm text-slate-500">
        {companiesResult.total.toLocaleString()}社の企業が見つかりました
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Sidebar: prefecture breakdown */}
        <div className="order-2 lg:order-1 lg:col-span-1">
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-800">
              都道府県別に探す
            </h2>
            <div className="rounded-lg border border-slate-200 bg-white">
              <ul className="divide-y divide-slate-100" role="list">
                {prefecturesWithNames.map((pref) => (
                  <li key={pref.slug}>
                    <Link
                      href={`/${pref.slug}/${slug}`}
                      className="flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-slate-50"
                    >
                      <span className="text-slate-700">{pref.name_ja}</span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {pref.company_count.toLocaleString()}社
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* Company table */}
        <div className="order-1 lg:order-2 lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <CompanyTable companies={companiesResult.items} />
          </div>
          <Pagination
            currentPage={page}
            totalPages={companiesResult.totalPages}
            basePath={`/${slug}`}
          />
        </div>
      </div>
    </div>
  );
}
