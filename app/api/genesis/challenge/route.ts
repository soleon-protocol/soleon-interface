import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SOLEON_CONFIG } from '@/lib/solana/config';
import {
  createGenesisChallenge,
  normalizeWalletAddress,
  storeGenesisChallenge,
} from '@/lib/genesis/challenge-server';
import type {
  GenesisApiErrorResponse,
  GenesisChallengeResponse,
} from '@/lib/genesis/challenge';
import {
  enforceRateLimit,
  hashRateLimitSubject,
  RedisUnavailableError,
} from '@/lib/server/upstash';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requestSchema = z.object({
  wallet: z.string().min(32).max(44),
});

function requestIp(request: NextRequest): string {
  return (
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
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

export async function POST(
  request: NextRequest
): Promise<NextResponse<GenesisChallengeResponse | GenesisApiErrorResponse>> {
  try {
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'The request body must be valid JSON.');
    }

    const parsed = requestSchema.safeParse(requestBody);
    if (!parsed.success) {
      return errorResponse(400, 'INVALID_REQUEST', 'A valid wallet address is required.');
    }

    let wallet: string;
    try {
      wallet = normalizeWalletAddress(parsed.data.wallet);
    } catch {
      return errorResponse(400, 'INVALID_WALLET', 'The wallet address is invalid.');
    }

    const network = SOLEON_CONFIG.cluster;
    const ipSubject = hashRateLimitSubject(requestIp(request));
    const walletSubject = hashRateLimitSubject(wallet);
    const [ipLimit, walletLimit] = await Promise.all([
      enforceRateLimit({
        key: `soleon:${network}:ratelimit:challenge:ip:${ipSubject}`,
        limit: 30,
        windowSeconds: 10 * 60,
      }),
      enforceRateLimit({
        key: `soleon:${network}:ratelimit:challenge:wallet:${walletSubject}`,
        limit: 5,
        windowSeconds: 10 * 60,
      }),
    ]);

    if (!ipLimit.allowed || !walletLimit.allowed) {
      return errorResponse(
        429,
        'RATE_LIMITED',
        'Too many challenge requests. Please try again later.',
        Math.max(ipLimit.retryAfterSeconds, walletLimit.retryAfterSeconds)
      );
    }

    const challenge = createGenesisChallenge({
      wallet,
      network,
      host: request.nextUrl.host,
    });
    const stored = await storeGenesisChallenge(network, challenge);
    if (!stored) {
      return errorResponse(503, 'CHALLENGE_UNAVAILABLE', 'Could not create a challenge.');
    }

    return NextResponse.json(
      {
        challengeId: challenge.id,
        message: challenge.message,
        expiresAt: challenge.expiresAt,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    if (error instanceof RedisUnavailableError) {
      return errorResponse(503, 'SERVICE_UNAVAILABLE', 'Verification service is unavailable.');
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Could not create the challenge.');
  }
}
