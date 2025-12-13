import { prisma } from '@/lib/db/prisma';
import { nanoid } from 'nanoid';
import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);

// DNS TXT record prefix for verification
export const DNS_VERIFICATION_PREFIX = 'url-shortener-verify=';

/**
 * Generate a unique verification token for domain verification
 */
export function generateVerifyToken(): string {
  return nanoid(32);
}

/**
 * Get the expected DNS TXT record value for a domain
 */
export function getExpectedTxtRecord(verifyToken: string): string {
  return `${DNS_VERIFICATION_PREFIX}${verifyToken}`;
}

/**
 * Get the DNS TXT record name for verification
 * Users should create a TXT record at _url-shortener.{domain}
 */
export function getVerificationRecordName(domain: string): string {
  return `_url-shortener.${domain}`;
}

/**
 * Check if a domain has the correct DNS TXT record for verification
 */
export async function verifyDomainDns(
  domain: string,
  verifyToken: string
): Promise<{ verified: boolean; error?: string }> {
  try {
    const recordName = getVerificationRecordName(domain);
    const expectedValue = getExpectedTxtRecord(verifyToken);

    // Resolve TXT records
    const records = await resolveTxt(recordName);

    // TXT records are returned as arrays of strings
    const flatRecords = records.map((record) => record.join(''));

    // Check if any record matches our expected value
    const verified = flatRecords.some((record) => record === expectedValue);

    return { verified };
  } catch (error) {
    // ENODATA or ENOTFOUND means no TXT records exist
    if (
      error instanceof Error &&
      ('code' in error && (error as NodeJS.ErrnoException).code === 'ENODATA' ||
       'code' in error && (error as NodeJS.ErrnoException).code === 'ENOTFOUND')
    ) {
      return {
        verified: false,
        error: 'DNS TXT record not found. Please add the verification record and try again.',
      };
    }

    return {
      verified: false,
      error: 'Failed to verify DNS. Please try again later.',
    };
  }
}

/**
 * Validate that a domain is in a valid format
 */
export function isValidDomain(domain: string): boolean {
  // Basic domain validation regex
  const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})+$/;
  return domainRegex.test(domain);
}

/**
 * Normalize a domain (lowercase, no trailing dot)
 */
export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().trim().replace(/\.+$/, '');
}

/**
 * Check if a domain is available (not already registered)
 */
export async function isDomainAvailable(
  domain: string,
  excludeUserId?: string
): Promise<boolean> {
  const existingDomain = await prisma.customDomain.findFirst({
    where: {
      domain: normalizeDomain(domain),
      ...(excludeUserId ? { NOT: { userId: excludeUserId } } : {}),
    },
  });

  return !existingDomain;
}

/**
 * Create a new custom domain for a user
 */
export async function createCustomDomain(
  userId: string,
  domain: string
): Promise<{
  id: string;
  domain: string;
  verifyToken: string;
  verificationRecord: string;
  expectedValue: string;
}> {
  const normalizedDomain = normalizeDomain(domain);
  const verifyToken = generateVerifyToken();

  const customDomain = await prisma.customDomain.create({
    data: {
      domain: normalizedDomain,
      userId,
      verifyToken,
      verified: false,
      sslStatus: 'PENDING',
    },
  });

  return {
    id: customDomain.id,
    domain: customDomain.domain,
    verifyToken,
    verificationRecord: getVerificationRecordName(normalizedDomain),
    expectedValue: getExpectedTxtRecord(verifyToken),
  };
}

/**
 * Verify a custom domain and update its status
 */
export async function verifyCustomDomain(
  domainId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const domain = await prisma.customDomain.findFirst({
    where: {
      id: domainId,
      userId,
    },
  });

  if (!domain) {
    return { success: false, error: 'Domain not found' };
  }

  if (domain.verified) {
    return { success: true };
  }

  if (!domain.verifyToken) {
    return { success: false, error: 'No verification token found' };
  }

  const result = await verifyDomainDns(domain.domain, domain.verifyToken);

  if (result.verified) {
    await prisma.customDomain.update({
      where: { id: domainId },
      data: {
        verified: true,
        verifiedAt: new Date(),
        sslStatus: 'PROVISIONING', // Start SSL provisioning
      },
    });

    return { success: true };
  }

  return { success: false, error: result.error };
}

/**
 * Delete a custom domain
 */
export async function deleteCustomDomain(
  domainId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.customDomain.deleteMany({
    where: {
      id: domainId,
      userId,
    },
  });

  return result.count > 0;
}

/**
 * Get all custom domains for a user
 */
export async function getUserDomains(userId: string) {
  return prisma.customDomain.findMany({
    where: { userId },
    include: {
      _count: {
        select: { links: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a single custom domain by ID
 */
export async function getDomainById(domainId: string, userId: string) {
  return prisma.customDomain.findFirst({
    where: {
      id: domainId,
      userId,
    },
    include: {
      _count: {
        select: { links: true },
      },
    },
  });
}
