import NextAuth from 'next-auth';
import { authConfig } from './config';

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);

// Helper to get session in server components
export { auth as getServerSession };

// Export auth config for routes that need it
export { authConfig as authOptions };
