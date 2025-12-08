export interface Link {
  id: string;
  originalUrl: string;
  shortCode: string;
  customAlias: string | null;
  title: string | null;
  description: string | null;
  password: string | null;
  expiresAt: Date | null;
  isActive: boolean;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  clicks?: Click[];
  tags?: Tag[];
  _count?: {
    clicks: number;
  };
}

export interface Click {
  id: string;
  linkId: string;
  ip: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  userAgent: string | null;
  clickedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
}

export interface CreateLinkInput {
  url: string;
  customAlias?: string;
  password?: string;
  expiresAt?: string;
  title?: string;
  description?: string;
}

export interface UpdateLinkInput {
  originalUrl?: string;
  customAlias?: string;
  password?: string;
  expiresAt?: string | null;
  title?: string;
  description?: string;
  isActive?: boolean;
  isFavorite?: boolean;
}

export interface LinkStats {
  totalClicks: number;
  uniqueVisitors: number;
  lastClick: Date | null;
  clicksByDate: { date: string; count: number }[];
  topCountries: { country: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  devices: { device: string; count: number }[];
  browsers: { browser: string; count: number }[];
  os: { os: string; count: number }[];
}

export interface BulkShortenResult {
  success: {
    originalUrl: string;
    shortUrl: string;
    shortCode: string;
  }[];
  failed: {
    originalUrl: string;
    error: string;
  }[];
}

export type SortOption = 'date' | 'clicks' | 'alpha';
export type FilterOption = 'all' | 'active' | 'expired' | 'protected';
export type TimePeriod = '7d' | '30d' | '90d' | 'all';
