import { prisma } from '@/lib/db/prisma';
import type { SslStatus } from '@/types';

/**
 * SSL Status Descriptions
 */
export const SSL_STATUS_INFO: Record<SslStatus, { label: string; description: string }> = {
  PENDING: {
    label: 'Pending',
    description: 'Domain verification required before SSL can be provisioned',
  },
  PROVISIONING: {
    label: 'Provisioning',
    description: 'SSL certificate is being provisioned. This may take a few minutes.',
  },
  ACTIVE: {
    label: 'Active',
    description: 'SSL certificate is active and your domain is secure',
  },
  FAILED: {
    label: 'Failed',
    description: 'SSL provisioning failed. Please contact support.',
  },
};

/**
 * Update the SSL status of a domain
 *
 * Note: In a production environment, this would integrate with:
 * - Cloudflare API for SSL provisioning
 * - Let's Encrypt for certificate generation
 * - Vercel/AWS for domain configuration
 */
export async function updateSslStatus(
  domainId: string,
  status: SslStatus
): Promise<void> {
  await prisma.customDomain.update({
    where: { id: domainId },
    data: { sslStatus: status },
  });
}

/**
 * Check if a domain's SSL is active
 */
export async function isSslActive(domain: string): Promise<boolean> {
  const customDomain = await prisma.customDomain.findUnique({
    where: { domain },
  });

  return customDomain?.sslStatus === 'ACTIVE';
}

/**
 * Provision SSL for a verified domain
 *
 * In production, this would:
 * 1. Request a certificate from Let's Encrypt
 * 2. Configure the certificate on the edge/proxy server
 * 3. Verify the certificate is working
 *
 * For now, we simulate the provisioning process
 */
export async function provisionSsl(domainId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const domain = await prisma.customDomain.findUnique({
    where: { id: domainId },
  });

  if (!domain) {
    return { success: false, error: 'Domain not found' };
  }

  if (!domain.verified) {
    return { success: false, error: 'Domain must be verified before SSL can be provisioned' };
  }

  if (domain.sslStatus === 'ACTIVE') {
    return { success: true };
  }

  // Update status to provisioning
  await updateSslStatus(domainId, 'PROVISIONING');

  try {
    // In production, here you would:
    // 1. Call Cloudflare/Let's Encrypt API
    // 2. Wait for certificate issuance
    // 3. Configure DNS/proxy settings

    // For demo purposes, we'll simulate success after a delay
    // In real implementation, this would be an async job

    // Simulate SSL provisioning (in production, use a job queue)
    setTimeout(async () => {
      try {
        await updateSslStatus(domainId, 'ACTIVE');
      } catch (error) {
        console.error('Failed to update SSL status:', error);
        await updateSslStatus(domainId, 'FAILED');
      }
    }, 5000); // 5 second delay for simulation

    return { success: true };
  } catch (error) {
    await updateSslStatus(domainId, 'FAILED');
    return {
      success: false,
      error: 'Failed to provision SSL certificate',
    };
  }
}

/**
 * Get instructions for setting up a custom domain
 */
export function getDomainSetupInstructions(domain: string, verifyToken: string) {
  return {
    steps: [
      {
        title: 'Add DNS Records',
        description: 'Add the following DNS records to your domain registrar:',
        records: [
          {
            type: 'TXT',
            name: `_url-shortener.${domain}`,
            value: `url-shortener-verify=${verifyToken}`,
            purpose: 'Domain verification',
          },
          {
            type: 'CNAME',
            name: domain,
            value: 'cname.url-shortener.app', // Replace with actual CNAME target
            purpose: 'Route traffic to URL Shortener',
          },
        ],
      },
      {
        title: 'Verify Domain',
        description: 'After adding DNS records, click the verify button. DNS changes may take up to 48 hours to propagate.',
      },
      {
        title: 'SSL Certificate',
        description: 'Once verified, we will automatically provision an SSL certificate for your domain.',
      },
    ],
    tips: [
      'DNS propagation can take anywhere from a few minutes to 48 hours',
      'You can use online DNS checker tools to verify your records',
      'Make sure to remove any conflicting A or AAAA records',
    ],
  };
}

/**
 * Check domain health (DNS, SSL, accessibility)
 */
export async function checkDomainHealth(domainId: string): Promise<{
  dns: boolean;
  ssl: boolean;
  accessible: boolean;
  issues: string[];
}> {
  const domain = await prisma.customDomain.findUnique({
    where: { id: domainId },
  });

  if (!domain) {
    return {
      dns: false,
      ssl: false,
      accessible: false,
      issues: ['Domain not found'],
    };
  }

  const issues: string[] = [];

  // Check DNS verification
  const dnsOk = domain.verified;
  if (!dnsOk) {
    issues.push('Domain DNS verification pending');
  }

  // Check SSL status
  const sslOk = domain.sslStatus === 'ACTIVE';
  if (!sslOk) {
    if (domain.sslStatus === 'FAILED') {
      issues.push('SSL certificate provisioning failed');
    } else if (domain.sslStatus === 'PROVISIONING') {
      issues.push('SSL certificate is being provisioned');
    } else {
      issues.push('SSL certificate pending verification');
    }
  }

  // Check accessibility (would need actual HTTP check in production)
  const accessible = dnsOk && sslOk;
  if (!accessible) {
    issues.push('Domain is not fully accessible yet');
  }

  return {
    dns: dnsOk,
    ssl: sslOk,
    accessible,
    issues,
  };
}
