import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { SOLEON_CONFIG } from '@/lib/solana/config';
import type { GenesisApiErrorResponse } from '@/lib/genesis/challenge';
import {
  consumeGenesisClaimAuthorization,
  normalizeWalletAddress,
} from '@/lib/genesis/challenge-server';
import { ELIGIBILITY_RULES_SHA256 } from '@/lib/genesis/eligibility';
import {
  buildSignedGenesisClaimTransaction,
  GenesisClaimError,
  type SignedGenesisClaimTransaction,
} from '@/lib/genesis/claim-server';
import { RedisUnavailableError } from '@/lib/server/upstash';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requestSchema = z.object({
  wallet: z.string().min(32).max(44),
  claimAuthorizationToken: z.string().min(32).max(64),
});

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

export async function POST(
  request: NextRequest
): Promise<NextResponse<SignedGenesisClaimTransaction | GenesisApiErrorResponse>> {
  try {
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'The request body must be valid JSON.');
    }
    const parsed = requestSchema.safeParse(requestBody);
    if (!parsed.success) {
      return errorResponse(400, 'INVALID_REQUEST', 'Invalid claim transaction request.');
    }

    let wallet: string;
    try {
      wallet = normalizeWalletAddress(parsed.data.wallet);
    } catch {
      return errorResponse(400, 'INVALID_WALLET', 'The wallet address is invalid.');
    }

    const authorizationConsumed = await consumeGenesisClaimAuthorization({
      network: SOLEON_CONFIG.cluster,
      wallet,
      rulesHash: ELIGIBILITY_RULES_SHA256,
      token: parsed.data.claimAuthorizationToken,
    });
    if (!authorizationConsumed) {
      return errorResponse(
        410,
        'CLAIM_AUTHORIZATION_EXPIRED',
        'Claim authorization expired or was already used.'
      );
    }

    return NextResponse.json(
      await buildSignedGenesisClaimTransaction(new PublicKey(wallet)),
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
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
    if (error instanceof RedisUnavailableError) {
      return errorResponse(503, 'SERVICE_UNAVAILABLE', 'Claim service is unavailable.');
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Could not build claim transaction.');
  }
}
