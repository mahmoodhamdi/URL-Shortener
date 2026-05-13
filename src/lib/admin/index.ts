/**
 * Admin role check.
 *
 * Admins are configured via the ADMIN_EMAILS environment variable as a
 * comma-separated list of email addresses (case-insensitive). This keeps the
 * Prisma schema unchanged for v1; the buyer can migrate to a User.role column
 * during their Phase-2 admin work without breaking the API surface here.
 */

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
