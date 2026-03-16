import type { Metadata } from 'next';
import Link from 'next/link';
import { getCachedPrefectures, getCachedIndustries, getCachedRecentCompanies } from '@/lib/queries';
import { PREFECTURE_BY_SLUG } from '@/lib/slugs';
import SearchBox from '@/components/SearchBox';
import PrefectureGrid from '@/components/PrefectureGrid';
import IndustryList from '@/components/IndustryList';
import CompanyTable from '@/components/CompanyTable';
import JsonLd from '@/components/JsonLd';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'GBase GTM - 全国100万社の企業情報',
  description:
    '日本全国約100万社の企業情報を都道府県・業界別に検索。会社概要、所在地、設立年、資本金などの企業データを無料で閲覧できます。',
};

export default async function HomePage() {
  const [prefectures, industries, recentCompanies] = await Promise.all([
    getCachedPrefectures(),
    getCachedIndustries(),
    getCachedRecentCompanies(10),
  ]);

  // Resolve prefecture names from slug lookups
  const prefecturesWithNames = prefectures.map((p) => ({
    ...p,
    name_ja: PREFECTURE_BY_SLUG.get(p.slug) ?? p.slug,
  }));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

  const jsonLdWebsite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'GBase GTM',
    url: siteUrl,
    description: '日本全国約100万社の企業情報を網羅した企業データベース',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <JsonLd data={jsonLdWebsite} />

      {/* Hero section with search */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-blue-50 to-white px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            日本全国の企業情報データベース
          </h1>
          <p className="mb-8 text-base text-slate-600 sm:text-lg">
            全国約100万社の企業情報を都道府県・業界別に検索
          </p>
          <SearchBox size="lg" />

          {/* Popular search quick-links */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="text-xs text-slate-400 self-center mr-1">人気の検索：</span>
            {[
              { label: '東京都', href: '/tokyo' },
              { label: '大阪府', href: '/osaka' },
              { label: '愛知県', href: '/aichi' },
              { label: 'IT業界', href: '/it' },
              { label: '建設業界', href: '/kensetsu' },
              { label: '製造業界', href: '/seizou' },
              { label: '不動産', href: '/fudousan' },
              { label: '医療・福祉', href: '/iryo-fukushi' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Prefecture grid */}
        <section className="mb-16">
          <h2 className="mb-6 text-xl font-bold text-slate-900">
            都道府県から企業を探す
          </h2>
          <PrefectureGrid prefectures={prefecturesWithNames} />
        </section>

        {/* Industry list */}
        <section className="mb-16">
          <h2 className="mb-6 text-xl font-bold text-slate-900">
            業界から企業を探す
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white">
            <IndustryList industries={industries} />
          </div>
        </section>

        {/* Recently updated companies */}
        <section>
          <h2 className="mb-6 text-xl font-bold text-slate-900">
            最近更新された企業
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <CompanyTable companies={recentCompanies} />
          </div>
        </section>
      </div>
    </>
  );
}
