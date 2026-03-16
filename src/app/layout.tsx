import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { PREFECTURES, INDUSTRIES } from '@/lib/slugs';

const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | GBase GTM',
    default: 'GBase GTM - 全国90万社の企業情報',
  },
  description:
    '日本全国約90万社の企業情報を網羅。都道府県・業界別に企業を検索できる日本最大級の企業データベースです。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const topIndustries = INDUSTRIES;

  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} antialiased min-h-screen flex flex-col`}
      >
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="block">
              <img
                src="https://s.gbase.ai/logo.png"
                alt="GBase GTM"
                className="h-7"
              />
            </Link>
            <Link
              href="/search"
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-blue-400 hover:text-slate-700"
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              企業を検索
            </Link>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            {/* Prefecture links grid */}
            <div className="mb-10">
              <h2 className="mb-4 text-sm font-bold text-slate-800">
                都道府県から探す
              </h2>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
                {PREFECTURES.map((pref) => (
                  <Link
                    key={pref.slug}
                    href={`/${pref.slug}`}
                    className="rounded px-1.5 py-1 text-center text-xs text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                  >
                    {pref.name_ja}
                  </Link>
                ))}
              </div>
            </div>

            {/* Top industry links */}
            <div className="mb-10">
              <h2 className="mb-4 text-sm font-bold text-slate-800">
                業界から探す
              </h2>
              <div className="flex flex-wrap gap-2">
                {topIndustries.map((ind) => (
                  <Link
                    key={ind.slug}
                    href={`/${ind.slug}`}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600"
                  >
                    {ind.name_ja}
                  </Link>
                ))}
              </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
              <p>&copy; {new Date().getFullYear()} GBase GTM</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
