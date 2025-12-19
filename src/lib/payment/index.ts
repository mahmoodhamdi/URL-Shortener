/**
 * Unified Payment Module
 *
 * This module provides a unified interface for multiple payment gateways:
 * - Stripe (International)
 * - Paymob (Egypt)
 * - PayTabs (MENA region)
 * - Paddle (Global MoR)
 */

// Types
export * from './types';

// Gateway Factory
export {
  getPaymentGateway,
  getGatewayForRegion,
  getConfiguredGateways,
  isProviderConfigured,
  getAvailablePaymentMethods,
  getPreferredGateways,
  resetGateways,
} from './gateway-factory';

// Payment Handlers
export {
  recordPayment,
  updatePaymentStatus,
  handleSubscriptionEvent,
  handleSubscriptionCancellation,
  createKioskPaymentRecord,
  getKioskPaymentByBillRef,
  mapPlanId,
} from './handlers';

// Individual Providers (for direct access if needed)
export { StripeGateway } from './providers/stripe';
export { PaymobGateway, createWalletPayment, createKioskPayment } from './providers/paymob';
export { PayTabsGateway } from './providers/paytabs';
export { PaddleGateway } from './providers/paddle';
