import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SOLEON_CONFIG } from '@/lib/solana/config';
import type {
  GenesisApiErrorResponse,
  GenesisChallengeVerificationResponse,
} from '@/lib/genesis/challenge';
import {
  consumeGenesisChallenge,
  createGenesisVerification,
  normalizeWalletAddress,
  readGenesisChallenge,
  verifyGenesisChallengeSignature,
} from '@/lib/genesis/challenge-server';
import {
  enforceRateLimit,
  hashRateLimitSubject,
  RedisUnavailableError,
} from '@/lib/server/upstash';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requestSchema = z.object({
  wallet: z.string().min(32).max(44),
  challengeId: z.string().min(32).max(64),
  signature: z.string().min(80).max(128),
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
): Promise<NextResponse<GenesisChallengeVerificationResponse | GenesisApiErrorResponse>> {
  try {
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'The request body must be valid JSON.');
    }

    const parsed = requestSchema.safeParse(requestBody);
    if (!parsed.success) {
      return errorResponse(400, 'INVALID_REQUEST', 'Invalid verification request.');
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
        key: `soleon:${network}:ratelimit:verify:ip:${ipSubject}`,
        limit: 60,
        windowSeconds: 10 * 60,
      }),
      enforceRateLimit({
        key: `soleon:${network}:ratelimit:verify:wallet:${walletSubject}`,
        limit: 10,
        windowSeconds: 10 * 60,
      }),
    ]);

    if (!ipLimit.allowed || !walletLimit.allowed) {
      return errorResponse(
        429,
        'RATE_LIMITED',
        'Too many verification attempts. Please try again later.',
        Math.max(ipLimit.retryAfterSeconds, walletLimit.retryAfterSeconds)
      );
    }

    const stored = await readGenesisChallenge(network, parsed.data.challengeId);
    const expiresAtMs = stored ? Date.parse(stored.challenge.expiresAt) : Number.NaN;
    if (!stored || !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      return errorResponse(410, 'CHALLENGE_EXPIRED', 'The challenge expired or was already used.');
    }
    if (
      stored.challenge.id !== parsed.data.challengeId ||
      stored.challenge.wallet !== wallet
    ) {
      return errorResponse(403, 'WALLET_MISMATCH', 'The challenge belongs to another wallet.');
    }

    const signatureValid = verifyGenesisChallengeSignature({
      wallet,
      message: stored.challenge.message,
      signatureBase64: parsed.data.signature,
    });
    if (!signatureValid) {
      return errorResponse(401, 'INVALID_SIGNATURE', 'The wallet signature is invalid.');
    }

    const consumed = await consumeGenesisChallenge(
      network,
      parsed.data.challengeId,
      stored.serialized
    );
    if (!consumed) {
      return errorResponse(409, 'CHALLENGE_USED', 'The challenge was already used.');
    }

    const verification = await createGenesisVerification({
      network,
      wallet,
    });
    const verifiedAt = new Date().toISOString();
    return NextResponse.json(
      {
        verified: true,
        wallet,
        verifiedAt,
        verificationToken: verification.token,
        verificationExpiresAt: verification.expiresAt,
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
    return errorResponse(500, 'INTERNAL_ERROR', 'Could not verify the challenge.');
  }
}
