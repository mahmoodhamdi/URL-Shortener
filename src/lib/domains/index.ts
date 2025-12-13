export {
  generateVerifyToken,
  getExpectedTxtRecord,
  getVerificationRecordName,
  verifyDomainDns,
  isValidDomain,
  normalizeDomain,
  isDomainAvailable,
  createCustomDomain,
  verifyCustomDomain,
  deleteCustomDomain,
  getUserDomains,
  getDomainById,
  DNS_VERIFICATION_PREFIX,
} from './verifier';

export {
  updateSslStatus,
  isSslActive,
  provisionSsl,
  getDomainSetupInstructions,
  checkDomainHealth,
  SSL_STATUS_INFO,
} from './ssl';
