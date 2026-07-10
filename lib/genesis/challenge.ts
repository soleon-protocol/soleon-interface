export const GENESIS_CHALLENGE_TTL_SECONDS = 5 * 60;
export const GENESIS_VERIFICATION_TTL_SECONDS = 10 * 60;
export const GENESIS_CLAIM_AUTHORIZATION_TTL_SECONDS = 10 * 60;

export interface GenesisChallenge {
  id: string;
  wallet: string;
  message: string;
  issuedAt: string;
  expiresAt: string;
}

export interface GenesisChallengeResponse {
  challengeId: string;
  message: string;
  expiresAt: string;
}

export interface GenesisChallengeVerificationResponse {
  verified: true;
  wallet: string;
  verifiedAt: string;
  verificationToken: string;
  verificationExpiresAt: string;
}

export interface GenesisApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
