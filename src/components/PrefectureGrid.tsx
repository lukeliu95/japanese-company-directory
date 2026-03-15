import Link from "next/link";

interface PrefectureItem {
  slug: string;
  name_ja: string;
  company_count: number;
}

interface PrefectureGridProps {
  prefectures: PrefectureItem[];
}

interface RegionDef {
  name: string;
  slugs: string[];
}

const REGIONS: RegionDef[] = [
  {
    name: "北海道・東北",
    slugs: [
      "hokkaido",
      "aomori",
      "iwate",
      "miyagi",
      "akita",
      "yamagata",
      "fukushima",
    ],
  },
  {
    name: "関東",
    slugs: [
      "ibaraki",
      "tochigi",
      "gunma",
      "saitama",
      "chiba",
      "tokyo",
      "kanagawa",
    ],
  },
  {
    name: "中部",
    slugs: [
      "niigata",
      "toyama",
      "ishikawa",
      "fukui",
      "yamanashi",
      "nagano",
      "gifu",
      "shizuoka",
      "aichi",
    ],
  },
  {
    name: "近畿",
    slugs: ["mie", "shiga", "kyoto", "osaka", "hyogo", "nara", "wakayama"],
  },
  {
    name: "中国",
    slugs: ["tottori", "shimane", "okayama", "hiroshima", "yamaguchi"],
  },
  {
    name: "四国",
    slugs: ["tokushima", "kagawa", "ehime", "kochi"],
  },
  {
    name: "九州・沖縄",
    slugs: [
      "fukuoka",
      "saga",
      "nagasaki",
      "kumamoto",
      "oita",
      "miyazaki",
      "kagoshima",
      "okinawa",
    ],
  },
];

export default function PrefectureGrid({ prefectures }: PrefectureGridProps) {
  const bySlug = new Map(prefectures.map((p) => [p.slug, p]));

  return (
    <div className="space-y-8">
      {REGIONS.map((region) => {
        const regionPrefectures = region.slugs
          .map((slug) => bySlug.get(slug))
          .filter((p): p is PrefectureItem => p != null);

        if (regionPrefectures.length === 0) return null;

        return (
          <section key={region.name} aria-labelledby={`region-${region.name}`}>
            <h3
              id={`region-${region.name}`}
              className="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-700"
            >
              {region.name}
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {regionPrefectures.map((pref) => (
                <Link
                  key={pref.slug}
                  href={`/${pref.slug}`}
                  className="flex flex-col items-center rounded-lg border border-slate-200 bg-white px-2 py-3 text-center transition-colors hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="text-sm font-medium text-slate-800">
                    {pref.name_ja}
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    {pref.company_count.toLocaleString()}社
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
