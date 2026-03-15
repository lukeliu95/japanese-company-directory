export interface Company {
  company_id: string;
  company_name: string | null;
  company_name_kana: string | null;
  company_name_en: string | null;
  location: string | null;
  listing_status: string | null;
  last_updated: string | null;
  corporate_number: string | null;
  securities_code: string | null;
  industry_tags: string | null; // JSON string of array
  summary: string | null;
  description: string | null;
  business_keywords: string | null; // JSON string of array
  features: string | null; // JSON string of array
  established_date: string | null;
  ipo_date: string | null;
  capital: string | null;
  revenue: string | null;
  revenue_growth: string | null;
  employees: string | null;
  employee_growth: string | null;
  new_grad_hires: string | null;
  office_count: string | null;
  factory_count: string | null;
  listing_market: string | null;
  fiscal_month: string | null;
  representative_name: string | null;
  address: string | null;
  offices_info: string | null; // JSON string of array
  page_url: string | null;
  prefecture_slug: string | null;
  city_slug: string | null;
}

export interface CompanyListItem {
  company_id: string;
  company_name: string | null;
  location: string | null;
  industry_tags: string | null;
  summary: string | null;
  established_date: string | null;
  capital: string | null;
  revenue: string | null;
}

export interface Prefecture {
  slug: string;
  name_ja: string;
  company_count: number;
}

export interface City {
  slug: string;
  name_ja: string;
  prefecture_slug: string;
  company_count: number;
}

export interface Industry {
  slug: string;
  name_ja: string;
  company_count: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
