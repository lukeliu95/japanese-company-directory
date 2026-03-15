import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getCompaniesByCity,
  getCompaniesByPrefectureAndIndustry,
  getCityBySlug,
  getIndustriesByPrefecture,
  getAllPrefectures,
} from '@/lib/queries';
import {
  PREFECTURE_SLUGS,
  PREFECTURE_BY_SLUG,
  INDUSTRY_BY_SLUG,
} from '@/lib/slugs';
import CompanyTable from '@/components/CompanyTable';
import Pagination from '@/components/Pagination';
import Breadcrumb from '@/components/Breadcrumb';
import IndustryList from '@/components/IndustryList';
import JsonLd from '@/components/JsonLd';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ slug: string; sub: string }>;
  searchParams: Promise<{ page?: string }>;
}

// ---- Determine page type ----
async function resolvePageType(prefectureSlug: string, sub: string) {
  // First, try city
  const city = await getCityBySlug(prefectureSlug, sub);
  if (city) {
    return { type: 'city' as const, city };
  }

  // Then, try industry
  if (INDUSTRY_BY_SLUG.has(sub)) {
    return { type: 'cross' as const };
  }

  return null;
}

// ---- Metadata ----
export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const rawParams = await params;
  const prefecture = rawParams.slug;
  const sub = decodeURIComponent(rawParams.sub);
  const sp = await searchParams;
  const page = Number(sp?.page) || 1;

  if (!PREFECTURE_SLUGS.has(prefecture)) {
    return { title: 'ページが見つかりません' };
  }

  const prefectureName = PREFECTURE_BY_SLUG.get(prefecture) ?? prefecture;
  const pageType = await resolvePageType(prefecture, sub);

  if (!pageType) {
    return { title: 'ページが見つかりません' };
  }

  if (pageType.type === 'city') {
    const cityName = pageType.city.name_ja;
    const title =
      page > 1
        ? `${prefectureName}${cityName}の企業一覧 (${page}ページ目)`
        : `${prefectureName}${cityName}の企業一覧`;
    return {
      title,
      description: `${prefectureName}${cityName}に所在する企業の一覧です。${pageType.city.company_count.toLocaleString()}社の企業情報を掲載。`,
      ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
      alternates: { canonical: `/${prefecture}/${encodeURIComponent(sub)}` },
    };
  }

  // Cross page
  const industryName = INDUSTRY_BY_SLUG.get(sub) ?? sub;
  const title =
    page > 1
      ? `${prefectureName}の${industryName} (${page}ページ目)`
      : `${prefectureName}の${industryName}`;
  return {
    title,
    description: `${prefectureName}にある${industryName}の企業一覧です。`,
    ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: `/${prefecture}/${encodeURIComponent(sub)}` },
  };
}

// ---- Page component ----
export default async function PrefectureSubPage({
  params,
  searchParams,
}: PageProps) {
  const rawParams = await params;
  const prefecture = rawParams.slug;
  const sub = decodeURIComponent(rawParams.sub);
  const sp = await searchParams;
  const page = Number(sp?.page) || 1;

  // Validate prefecture
  if (!PREFECTURE_SLUGS.has(prefecture)) {
    notFound();
  }

  const pageType = await resolvePageType(prefecture, sub);

  if (!pageType) {
    notFound();
  }

  if (pageType.type === 'city') {
    return (
      <CityPage
        prefectureSlug={prefecture}
        citySlug={sub}
        cityName={pageType.city.name_ja}
        page={page}
      />
    );
  }

  return (
    <CrossPage
      prefectureSlug={prefecture}
      industrySlug={sub}
      page={page}
    />
  );
}

// =====================================================================
// City page
// =====================================================================
async function CityPage({
  prefectureSlug,
  citySlug,
  cityName,
  page,
}: {
  prefectureSlug: string;
  citySlug: string;
  cityName: string;
  page: number;
}) {
  const prefectureName =
    PREFECTURE_BY_SLUG.get(prefectureSlug) ?? prefectureSlug;

  const [companiesResult, industries] = await Promise.all([
    getCompaniesByCity(prefectureSlug, citySlug, page),
    getIndustriesByPrefecture(prefectureSlug),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

  const breadcrumbItems = [
    { label: 'ホーム', href: '/' },
    { label: prefectureName, href: `/${prefectureSlug}` },
    { label: cityName },
  ];

  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${prefectureName}${cityName}の企業一覧`,
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
        {prefectureName}
        {cityName}の企業一覧
      </h1>
      <p className="mb-8 text-sm text-slate-500">
        {companiesResult.total.toLocaleString()}社の企業が見つかりました
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="order-2 lg:order-1 lg:col-span-1">
          {/* Industry breakdown for this area */}
          {industries.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-slate-800">
                業界から探す
              </h2>
              <div className="rounded-lg border border-slate-200 bg-white">
                <IndustryList
                  industries={industries}
                  prefectureSlug={prefectureSlug}
                />
              </div>
            </section>
          )}

          {/* Back to prefecture */}
          <div className="mt-6">
            <Link
              href={`/${prefectureSlug}`}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {prefectureName}の企業一覧に戻る
            </Link>
          </div>
        </div>

        {/* Company table */}
        <div className="order-1 lg:order-2 lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <CompanyTable companies={companiesResult.items} />
          </div>
          <Pagination
            currentPage={page}
            totalPages={companiesResult.totalPages}
            basePath={`/${prefectureSlug}/${encodeURIComponent(citySlug)}`}
          />
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Cross page (prefecture x industry)
// =====================================================================
async function CrossPage({
  prefectureSlug,
  industrySlug,
  page,
}: {
  prefectureSlug: string;
  industrySlug: string;
  page: number;
}) {
  const prefectureName =
    PREFECTURE_BY_SLUG.get(prefectureSlug) ?? prefectureSlug;
  const industryName = INDUSTRY_BY_SLUG.get(industrySlug) ?? industrySlug;

  const [companiesResult, allPrefectures, prefectureIndustries] =
    await Promise.all([
      getCompaniesByPrefectureAndIndustry(prefectureSlug, industrySlug, page),
      getAllPrefectures(),
      getIndustriesByPrefecture(prefectureSlug),
    ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

  const breadcrumbItems = [
    { label: 'ホーム', href: '/' },
    { label: prefectureName, href: `/${prefectureSlug}` },
    { label: industryName },
  ];

  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${prefectureName}の${industryName}`,
    numberOfItems: companiesResult.total,
    itemListElement: companiesResult.items.map((company, index) => ({
      '@type': 'ListItem',
      position: (page - 1) * 50 + index + 1,
      name: company.company_name,
      url: `${siteUrl}/company/${company.company_id}`,
    })),
  };

  // Other prefectures with the same industry for "related links"
  const otherPrefectures = allPrefectures
    .filter((p) => p.slug !== prefectureSlug)
    .map((p) => ({
      ...p,
      name_ja: PREFECTURE_BY_SLUG.get(p.slug) ?? p.slug,
    }))
    .slice(0, 10);

  // Other industries in the same prefecture
  const otherIndustries = prefectureIndustries
    .filter((i) => i.slug !== industrySlug)
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd data={jsonLdData} />
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        {prefectureName}の{industryName}
      </h1>
      <p className="mb-8 text-sm text-slate-500">
        {companiesResult.total.toLocaleString()}社の企業が見つかりました
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="order-2 lg:order-1 lg:col-span-1">
          {/* Same industry in other prefectures */}
          {otherPrefectures.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-base font-semibold text-slate-800">
                他の都道府県の{industryName}
              </h2>
              <div className="rounded-lg border border-slate-200 bg-white">
                <ul className="divide-y divide-slate-100" role="list">
                  {otherPrefectures.map((pref) => (
                    <li key={pref.slug}>
                      <Link
                        href={`/${pref.slug}/${industrySlug}`}
                        className="flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-slate-50"
                      >
                        <span className="text-slate-700">
                          {pref.name_ja}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={`/${industrySlug}`}
                className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                全国の{industryName}を見る
              </Link>
            </section>
          )}

          {/* Other industries in same prefecture */}
          {otherIndustries.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-slate-800">
                {prefectureName}の他の業界
              </h2>
              <div className="rounded-lg border border-slate-200 bg-white">
                <IndustryList
                  industries={otherIndustries}
                  prefectureSlug={prefectureSlug}
                />
              </div>
            </section>
          )}

          {/* Back links */}
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={`/${prefectureSlug}`}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {prefectureName}の企業一覧に戻る
            </Link>
            <Link
              href={`/${industrySlug}`}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {industryName}の一覧に戻る
            </Link>
          </div>
        </div>

        {/* Company table */}
        <div className="order-1 lg:order-2 lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <CompanyTable companies={companiesResult.items} />
          </div>
          <Pagination
            currentPage={page}
            totalPages={companiesResult.totalPages}
            basePath={`/${prefectureSlug}/${industrySlug}`}
          />
        </div>
      </div>
    </div>
  );
}
