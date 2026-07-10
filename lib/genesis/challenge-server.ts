import 'server-only';

import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';
import {
  GENESIS_CHALLENGE_TTL_SECONDS,
  GENESIS_CLAIM_AUTHORIZATION_TTL_SECONDS,
  GENESIS_VERIFICATION_TTL_SECONDS,
  type GenesisChallenge,
} from '@/lib/genesis/challenge';
import { upstashCommand } from '@/lib/server/upstash';

function challengeKey(network: string, challengeId: string): string {
  return `soleon:${network}:genesis:challenge:v1:${challengeId}`;
}

function verificationKey(network: string, token: string): string {
  return `soleon:${network}:genesis:verification:v1:${token}`;
}

function claimAuthorizationKey(network: string, token: string): string {
  return `soleon:${network}:genesis:claim-authorization:v1:${token}`;
}

export function normalizeWalletAddress(value: string): string {
  const normalized = new PublicKey(value).toBase58();
  if (normalized !== value) {
    throw new Error('Wallet address is not canonical');
  }
  return normalized;
}

export function createGenesisChallenge(params: {
  wallet: string;
  network: string;
  host: string;
  now?: Date;
}): GenesisChallenge {
  const now = params.now ?? new Date();
  const expiresAt = new Date(now.getTime() + GENESIS_CHALLENGE_TTL_SECONDS * 1_000);
  const id = randomBytes(32).toString('base64url');
  const issuedAtIso = now.toISOString();
  const expiresAtIso = expiresAt.toISOString();

  const message = [
    'Soleon Genesis Claim',
    '',
    'Sign this message to verify ownership of your wallet.',
    'This request is free and does not authorize a transaction or token transfer.',
    '',
    `Wallet: ${params.wallet}`,
    `Network: ${params.network}`,
    `Domain: ${params.host}`,
    `Challenge: ${id}`,
    `Issued at: ${issuedAtIso}`,
    `Expires at: ${expiresAtIso}`,
  ].join('\n');

  return {
    id,
    wallet: params.wallet,
    message,
    issuedAt: issuedAtIso,
    expiresAt: expiresAtIso,
  };
}

export async function storeGenesisChallenge(
  network: string,
  challenge: GenesisChallenge
): Promise<boolean> {
  const result = await upstashCommand<string | null>([
    'SET',
    challengeKey(network, challenge.id),
    JSON.stringify(challenge),
    'NX',
    'EX',
    GENESIS_CHALLENGE_TTL_SECONDS,
  ]);
  return result === 'OK';
}

export async function readGenesisChallenge(
  network: string,
  challengeId: string
): Promise<{ challenge: GenesisChallenge; serialized: string } | null> {
  const serialized = await upstashCommand<string | null>([
    'GET',
    challengeKey(network, challengeId),
  ]);
  if (!serialized) return null;

  try {
    const challenge = JSON.parse(serialized) as GenesisChallenge;
    if (
      typeof challenge.id !== 'string' ||
      typeof challenge.wallet !== 'string' ||
      typeof challenge.message !== 'string' ||
      typeof challenge.expiresAt !== 'string'
    ) {
      return null;
    }
    return { challenge, serialized };
  } catch {
    return null;
  }
}

export async function consumeGenesisChallenge(
  network: string,
  challengeId: string,
  serializedChallenge: string
): Promise<boolean> {
  const script = [
    "local current = redis.call('GET', KEYS[1])",
    'if current == ARGV[1] then',
    "  redis.call('DEL', KEYS[1])",
    '  return 1',
    'end',
    'return 0',
  ].join('\n');

  const consumed = await upstashCommand<number>([
    'EVAL',
    script,
    1,
    challengeKey(network, challengeId),
    serializedChallenge,
  ]);
  return consumed === 1;
}

export async function createGenesisVerification(params: {
  network: string;
  wallet: string;
}): Promise<{ token: string; expiresAt: string }> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = randomBytes(32).toString('base64url');
    const result = await upstashCommand<string | null>([
      'SET',
      verificationKey(params.network, token),
      params.wallet,
      'NX',
      'EX',
      GENESIS_VERIFICATION_TTL_SECONDS,
    ]);
    if (result === 'OK') {
      return {
        token,
        expiresAt: new Date(
          Date.now() + GENESIS_VERIFICATION_TTL_SECONDS * 1_000
        ).toISOString(),
      };
    }
  }
  throw new Error('Could not create a wallet verification');
}

export async function consumeGenesisVerification(params: {
  network: string;
  wallet: string;
  token: string;
}): Promise<boolean> {
  const script = [
    "local current = redis.call('GET', KEYS[1])",
    'if current == ARGV[1] then',
    "  redis.call('DEL', KEYS[1])",
    '  return 1',
    'end',
    'return 0',
  ].join('\n');
  const consumed = await upstashCommand<number>([
    'EVAL',
    script,
    1,
    verificationKey(params.network, params.token),
    params.wallet,
  ]);
  return consumed === 1;
}

export async function createGenesisClaimAuthorization(params: {
  network: string;
  wallet: string;
  rulesHash: string;
}): Promise<{ token: string; expiresAt: string }> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = randomBytes(32).toString('base64url');
    const value = `${params.wallet}:${params.rulesHash}`;
    const result = await upstashCommand<string | null>([
      'SET',
      claimAuthorizationKey(params.network, token),
      value,
      'NX',
      'EX',
      GENESIS_CLAIM_AUTHORIZATION_TTL_SECONDS,
    ]);
    if (result === 'OK') {
      return {
        token,
        expiresAt: new Date(
          Date.now() + GENESIS_CLAIM_AUTHORIZATION_TTL_SECONDS * 1_000
        ).toISOString(),
      };
    }
  }
  throw new Error('Could not create a claim authorization');
}

export async function consumeGenesisClaimAuthorization(params: {
  network: string;
  wallet: string;
  rulesHash: string;
  token: string;
}): Promise<boolean> {
  const script = [
    "local current = redis.call('GET', KEYS[1])",
    'if current == ARGV[1] then',
    "  redis.call('DEL', KEYS[1])",
    '  return 1',
    'end',
    'return 0',
  ].join('\n');
  const consumed = await upstashCommand<number>([
    'EVAL',
    script,
    1,
    claimAuthorizationKey(params.network, params.token),
    `${params.wallet}:${params.rulesHash}`,
  ]);
  return consumed === 1;
}

export function verifyGenesisChallengeSignature(params: {
  wallet: string;
  message: string;
  signatureBase64: string;
}): boolean {
  const publicKeyBytes = new PublicKey(params.wallet).toBytes();
  const signature = Buffer.from(params.signatureBase64, 'base64');
  if (signature.length !== 64) return false;

  const ed25519SpkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
  const publicKey = createPublicKey({
    key: Buffer.concat([ed25519SpkiPrefix, Buffer.from(publicKeyBytes)]),
    format: 'der',
    type: 'spki',
  });

  return verify(
    null,
    Buffer.from(params.message, 'utf8'),
    publicKey,
    signature
  );
}
