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
  userId: string | null;
  folderId: string | null;
  customDomainId: string | null;
  // UTM parameters
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  // Relations
  clicks?: Click[];
  tags?: Tag[];
  folder?: Folder;
  customDomain?: CustomDomain;
  targets?: LinkTarget[];
  _count?: {
    clicks: number;
    targets?: number;
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
  password?: string | null;
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

// Auth types
export type Plan = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'INCOMPLETE';

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  linksUsedThisMonth: number;
}

export interface Folder {
  id: string;
  name: string;
  color: string | null;
  userId: string;
  createdAt: Date;
  _count?: {
    links: number;
  };
}

export type SslStatus = 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'FAILED';

export interface CustomDomain {
  id: string;
  domain: string;
  userId: string;
  verified: boolean;
  verifyToken: string | null;
  verifiedAt: Date | null;
  sslStatus: SslStatus;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    links: number;
  };
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

// Targeting types
export type TargetType = 'DEVICE' | 'OS' | 'BROWSER' | 'COUNTRY' | 'LANGUAGE';

export interface LinkTarget {
  id: string;
  linkId: string;
  type: TargetType;
  value: string;
  targetUrl: string;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLinkTargetInput {
  type: TargetType;
  value: string;
  targetUrl: string;
  priority?: number;
  isActive?: boolean;
}

export interface UpdateLinkTargetInput {
  targetUrl?: string;
  priority?: number;
  isActive?: boolean;
}

// Workspace types
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  ownerId: string;
  owner?: User;
  role?: WorkspaceRole;
  membersCount?: number;
  linksCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  user?: User;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: Date;
  createdAt: Date;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  logo?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  logo?: string;
}

export interface InviteMemberInput {
  email: string;
  role?: WorkspaceRole;
}
