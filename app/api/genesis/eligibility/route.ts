import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { SOLEON_CONFIG } from '@/lib/solana/config';
import type { GenesisApiErrorResponse } from '@/lib/genesis/challenge';
import {
  createGenesisClaimAuthorization,
  consumeGenesisVerification,
  normalizeWalletAddress,
} from '@/lib/genesis/challenge-server';
import {
  evaluateWalletEligibilityWithCache,
  type EligibilityServiceResult,
} from '@/lib/genesis/eligibility-service';
import type { EligibilityEvaluation } from '@/lib/genesis/eligibility';
import { RedisUnavailableError } from '@/lib/server/upstash';
import {
  GenesisClaimError,
  getGenesisClaimStatus,
} from '@/lib/genesis/claim-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requestSchema = z.object({
  wallet: z.string().min(32).max(44),
  verificationToken: z.string().min(32).max(64),
});

export interface EligibilityApiResponse {
  evaluation: EligibilityEvaluation;
  cached: boolean;
  claimAuthorizationToken: string | null;
  claimAuthorizationExpiresAt: string | null;
}

export interface GenesisClaimStatusApiResponse {
  configured: boolean;
  closed: boolean;
  alreadyClaimed: boolean;
  claimsToday: number;
  remainingClaimsToday: number;
  vaultBalance: string;
  canClaim: boolean;
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  retryAfterSeconds?: number
): NextResponse<GenesisApiErrorResponse> {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: retryAfterSeconds
        ? { 'Retry-After': String(retryAfterSeconds) }
        : undefined,
    }
  );
}

function serviceErrorResponse(
  result: Exclude<EligibilityServiceResult, { kind: 'evaluation' }>
): NextResponse<GenesisApiErrorResponse> {
  if (result.kind === 'daily_limit') {
    return errorResponse(
      429,
      'DAILY_EVALUATION_LIMIT',
      'The daily eligibility evaluation limit has been reached.',
      result.retryAfterSeconds
    );
  }
  return errorResponse(
    409,
    'EVALUATION_IN_PROGRESS',
    'An eligibility evaluation is already in progress for this wallet.'
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<EligibilityApiResponse | GenesisApiErrorResponse>> {
  try {
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'The request body must be valid JSON.');
    }
    const parsed = requestSchema.safeParse(requestBody);
    if (!parsed.success) {
      return errorResponse(400, 'INVALID_REQUEST', 'Invalid eligibility request.');
    }

    let wallet: string;
    try {
      wallet = normalizeWalletAddress(parsed.data.wallet);
    } catch {
      return errorResponse(400, 'INVALID_WALLET', 'The wallet address is invalid.');
    }

    const verificationConsumed = await consumeGenesisVerification({
      network: SOLEON_CONFIG.cluster,
      wallet,
      token: parsed.data.verificationToken,
    });
    if (!verificationConsumed) {
      return errorResponse(
        410,
        'VERIFICATION_EXPIRED',
        'Wallet verification expired or was already used.'
      );
    }

    const result = await evaluateWalletEligibilityWithCache({ wallet });
    if (result.kind !== 'evaluation') return serviceErrorResponse(result);

    const claimAuthorization =
      result.evaluation.status === 'eligible'
        ? await createGenesisClaimAuthorization({
            network: SOLEON_CONFIG.cluster,
            wallet,
            rulesHash: result.evaluation.rulesHash,
          })
        : null;
    return NextResponse.json(
      {
        evaluation: result.evaluation,
        cached: result.cached,
        claimAuthorizationToken: claimAuthorization?.token ?? null,
        claimAuthorizationExpiresAt: claimAuthorization?.expiresAt ?? null,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    if (error instanceof RedisUnavailableError) {
      return errorResponse(503, 'SERVICE_UNAVAILABLE', 'Eligibility service is unavailable.');
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Could not evaluate wallet eligibility.');
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<GenesisClaimStatusApiResponse | GenesisApiErrorResponse>> {
  const walletParam = request.nextUrl.searchParams.get('wallet');
  if (!walletParam) {
    return errorResponse(400, 'INVALID_REQUEST', 'A wallet address is required.');
  }

  let wallet: string;
  try {
    wallet = normalizeWalletAddress(walletParam);
  } catch {
    return errorResponse(400, 'INVALID_WALLET', 'The wallet address is invalid.');
  }

  try {
    const status = await getGenesisClaimStatus(new PublicKey(wallet));
    return NextResponse.json(
      {
        configured: status.configured,
        closed: status.closed,
        alreadyClaimed: status.alreadyClaimed,
        claimsToday: status.claimsToday,
        remainingClaimsToday: status.remainingClaimsToday,
        vaultBalance: status.vaultBalance.toString(),
        canClaim: status.canClaim,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    if (error instanceof GenesisClaimError) {
      return errorResponse(
        error.status,
        error.code,
        error.message,
        error.retryAfterSeconds
      );
    }
    return errorResponse(503, 'SERVICE_UNAVAILABLE', 'Claim status is unavailable.');
  }
}
