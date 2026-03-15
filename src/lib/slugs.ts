// ---------------------------------------------------------------------------
// Prefecture definitions — all 47 Japanese prefectures
// ---------------------------------------------------------------------------

export const PREFECTURES = [
  { slug: 'hokkaido', name_ja: '北海道' },
  { slug: 'aomori', name_ja: '青森県' },
  { slug: 'iwate', name_ja: '岩手県' },
  { slug: 'miyagi', name_ja: '宮城県' },
  { slug: 'akita', name_ja: '秋田県' },
  { slug: 'yamagata', name_ja: '山形県' },
  { slug: 'fukushima', name_ja: '福島県' },
  { slug: 'ibaraki', name_ja: '茨城県' },
  { slug: 'tochigi', name_ja: '栃木県' },
  { slug: 'gunma', name_ja: '群馬県' },
  { slug: 'saitama', name_ja: '埼玉県' },
  { slug: 'chiba', name_ja: '千葉県' },
  { slug: 'tokyo', name_ja: '東京都' },
  { slug: 'kanagawa', name_ja: '神奈川県' },
  { slug: 'niigata', name_ja: '新潟県' },
  { slug: 'toyama', name_ja: '富山県' },
  { slug: 'ishikawa', name_ja: '石川県' },
  { slug: 'fukui', name_ja: '福井県' },
  { slug: 'yamanashi', name_ja: '山梨県' },
  { slug: 'nagano', name_ja: '長野県' },
  { slug: 'gifu', name_ja: '岐阜県' },
  { slug: 'shizuoka', name_ja: '静岡県' },
  { slug: 'aichi', name_ja: '愛知県' },
  { slug: 'mie', name_ja: '三重県' },
  { slug: 'shiga', name_ja: '滋賀県' },
  { slug: 'kyoto', name_ja: '京都府' },
  { slug: 'osaka', name_ja: '大阪府' },
  { slug: 'hyogo', name_ja: '兵庫県' },
  { slug: 'nara', name_ja: '奈良県' },
  { slug: 'wakayama', name_ja: '和歌山県' },
  { slug: 'tottori', name_ja: '鳥取県' },
  { slug: 'shimane', name_ja: '島根県' },
  { slug: 'okayama', name_ja: '岡山県' },
  { slug: 'hiroshima', name_ja: '広島県' },
  { slug: 'yamaguchi', name_ja: '山口県' },
  { slug: 'tokushima', name_ja: '徳島県' },
  { slug: 'kagawa', name_ja: '香川県' },
  { slug: 'ehime', name_ja: '愛媛県' },
  { slug: 'kochi', name_ja: '高知県' },
  { slug: 'fukuoka', name_ja: '福岡県' },
  { slug: 'saga', name_ja: '佐賀県' },
  { slug: 'nagasaki', name_ja: '長崎県' },
  { slug: 'kumamoto', name_ja: '熊本県' },
  { slug: 'oita', name_ja: '大分県' },
  { slug: 'miyazaki', name_ja: '宮崎県' },
  { slug: 'kagoshima', name_ja: '鹿児島県' },
  { slug: 'okinawa', name_ja: '沖縄県' },
] as const;

// ---------------------------------------------------------------------------
// Prefecture lookup structures — O(1) access
// ---------------------------------------------------------------------------

/** Set of all valid prefecture slugs for fast routing validation. */
export const PREFECTURE_SLUGS: Set<string> = new Set(
  PREFECTURES.map((p) => p.slug),
);

/** slug -> name_ja */
export const PREFECTURE_BY_SLUG: Map<string, string> = new Map(
  PREFECTURES.map((p) => [p.slug, p.name_ja]),
);

/**
 * name_ja -> slug.
 * Includes both full suffix forms (東京都, 京都府, 大阪府, 北海道, *県)
 * and bare forms without suffix (東京, 京都, 大阪, 北海道, 青森, ...).
 */
export const PREFECTURE_BY_NAME: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const p of PREFECTURES) {
    // Full form: 東京都, 京都府, 大阪府, 北海道, 青森県, etc.
    map.set(p.name_ja, p.slug);

    // Bare form without suffix (都/道/府/県)
    const bare = p.name_ja.replace(/[都道府県]$/, '');
    if (bare !== p.name_ja) {
      map.set(bare, p.slug);
    }
  }
  return map;
})();

// ---------------------------------------------------------------------------
// Industry definitions
// ---------------------------------------------------------------------------

export const INDUSTRIES = [
  { slug: 'kensetsu', name_ja: '建設・工事業界の会社' },
  { slug: 'kouri', name_ja: '小売業界の会社' },
  { slug: 'it', name_ja: 'IT業界の会社' },
  { slug: 'seizou', name_ja: '製造業界の会社' },
  { slug: 'fudousan', name_ja: '不動産業界の会社' },
  { slug: 'iryo-fukushi', name_ja: '医療・福祉業界の会社' },
  { slug: 'shokuhin', name_ja: '食品業界の会社' },
  { slug: 'shousha', name_ja: '商社業界の会社' },
  { slug: 'consulting', name_ja: 'コンサルティング業界の会社' },
  { slug: 'entertainment', name_ja: 'エンタメ業界の会社' },
  { slug: 'kikai', name_ja: '機械業界の会社' },
  { slug: 'jinzai', name_ja: '人材業界の会社' },
  { slug: 'apparel-biyou', name_ja: 'アパレル・美容業界の会社' },
  { slug: 'ecommerce', name_ja: '自社型eコマース業界の会社' },
  { slug: 'unyu-butsuryu', name_ja: '運輸・物流業界の会社' },
  { slug: 'koukoku', name_ja: '広告業界の会社' },
  { slug: 'jidousha', name_ja: '自動車・乗り物業界の会社' },
  { slug: 'kagaku', name_ja: '化学業界の会社' },
  { slug: 'gaishoku', name_ja: '外食業界の会社' },
  { slug: 'kyouiku', name_ja: '教育業界' },
  { slug: 'web-seisaku', name_ja: 'Web制作業界の会社' },
  { slug: 'seikatsu-youhin', name_ja: '生活用品業界の会社' },
  { slug: 'other-service', name_ja: 'その他サービス業界の会社' },
  { slug: 'reform-jukyo', name_ja: '居住用リフォーム業界の会社' },
  { slug: 'eisei-setsubi', name_ja: '衛生設備工事業界の会社' },
  { slug: 'other-kenchiku', name_ja: 'その他建造物建築業界の会社' },
  { slug: 'other-doboku', name_ja: 'その他土木工事業界の会社' },
  { slug: 'kotsu-doboku', name_ja: '交通関連土木工事業界の会社' },
  { slug: 'other-kensetsu-senmon', name_ja: 'その他建築専門工事業界の会社' },
  { slug: 'tobi-doko', name_ja: 'とび・土工工事業界の会社' },
  { slug: 'chumon-jutaku', name_ja: '注文型住宅建築業界の会社' },
  { slug: 'jutaku-setsubi', name_ja: '住宅・事業所向け設備業界の会社' },
  { slug: 'kuuchou-setsubi', name_ja: '空調設備工事業界の会社' },
  { slug: 'reform-jigyou', name_ja: '事業用リフォーム業界の会社' },
  { slug: 'kikai-service', name_ja: '機械関連サービス業界の会社' },
  { slug: 'kaitai', name_ja: '建造物解体工事業界の会社' },
  { slug: 'kasen-kouwan', name_ja: '河川・港湾工事業界の会社' },
  { slug: 'haikibutsu', name_ja: '廃棄物収集・運搬業界の会社' },
  { slug: 'taiyoukou', name_ja: '太陽光パネル業界の会社' },
] as const;

// ---------------------------------------------------------------------------
// Industry lookup structures — O(1) access
// ---------------------------------------------------------------------------

/** slug -> name_ja */
export const INDUSTRY_BY_SLUG: Map<string, string> = new Map(
  INDUSTRIES.map((i) => [i.slug, i.name_ja]),
);

/** name_ja -> slug */
export const INDUSTRY_BY_NAME: Map<string, string> = new Map(
  INDUSTRIES.map((i) => [i.name_ja, i.slug]),
);

// ---------------------------------------------------------------------------
// Location parsing utilities
// ---------------------------------------------------------------------------

/**
 * Ordered list of prefecture suffixed names for greedy prefix matching.
 * Sorted longest-first so that 神奈川県 matches before a hypothetical shorter
 * prefix. 北海道 has no 県 suffix so it is included as-is.
 */
const PREFECTURE_NAMES_SORTED = PREFECTURES.map((p) => p.name_ja).sort(
  (a, b) => b.length - a.length,
);

/**
 * Extract a prefecture slug from a free-form Japanese location string.
 *
 * Examples:
 *   "東京都港区"      -> "tokyo"
 *   "大阪府大阪市"    -> "osaka"
 *   "北海道札幌市"    -> "hokkaido"
 *   "京都府京都市"    -> "kyoto"
 *
 * Returns null when no known prefecture prefix is found.
 */
export function parsePrefectureFromLocation(
  location: string | null | undefined,
): string | null {
  if (!location) return null;

  for (const name of PREFECTURE_NAMES_SORTED) {
    if (location.startsWith(name)) {
      return PREFECTURE_BY_NAME.get(name) ?? null;
    }
  }

  return null;
}

/**
 * Extract the city portion of a location string once the prefecture has been
 * stripped. The city is the text segment immediately after the prefecture name
 * up to (and including) the first 市/区/町/村/郡 suffix character.
 *
 * Examples:
 *   ("東京都港区赤坂", "tokyo")   -> "港区"
 *   ("大阪府大阪市北区", "osaka") -> "大阪市"
 *   ("北海道札幌市中央区", "hokkaido") -> "札幌市"
 *
 * Returns the raw Japanese city name (not a slug). The caller is responsible
 * for slugifying if needed.
 *
 * Returns null when the city portion cannot be determined.
 */
export function parseCityFromLocation(
  location: string | null | undefined,
  prefectureSlug: string,
): string | null {
  if (!location) return null;

  // Find the full prefecture name for this slug
  const prefectureName = PREFECTURE_BY_SLUG.get(prefectureSlug);
  if (!prefectureName) return null;

  // Strip the prefecture prefix
  if (!location.startsWith(prefectureName)) return null;
  const rest = location.slice(prefectureName.length);
  if (!rest) return null;

  // Match the city: everything up to and including the first 市/区/町/村/郡
  // For Tokyo special wards (23区), the pattern is just *区.
  // For regular cities, the pattern is *市.
  // For towns/villages: *町, *村, *郡*町, *郡*村.
  const cityMatch = rest.match(/^(.+?[市区町村郡])/);
  if (cityMatch) {
    return cityMatch[1];
  }

  return null;
}
