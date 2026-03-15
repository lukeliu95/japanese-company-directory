import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchResults from './SearchResults';

export const metadata: Metadata = {
  title: '企業検索',
  description: 'GBase GTMの企業検索ページです。会社名やキーワードで全国90万社から検索できます。',
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">企業検索</h1>
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-slate-500">
            読み込み中...
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </div>
  );
}
