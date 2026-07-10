import 'server-only';

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  calculateEpochFee,
  getMint,
  getTransferFeeConfig,
  unpackAccount,
} from '@solana/spl-token';
import { getEligibilitySignerServerEnv } from '@/lib/env/server';
import { SOLEON_CONFIG, MAX_DAILY_GENESIS_CLAIMS } from '@/lib/solana/config';
import {
  COMMITMENT_CLAIM_AMOUNTS,
  createCommitmentClaimTransaction,
  decodeCommitmentDistributionConfigAccount,
  deriveCommitmentClaimReceiptPda,
  deriveCommitmentDistributionConfigPda,
  type CommitmentDistributionConfigAccount,
} from '@/lib/solana/client';

const SECONDS_PER_DAY = 86_400;

export type GenesisClaimErrorCode =
  | 'PROGRAM_NOT_CONFIGURED'
  | 'DISTRIBUTION_NOT_INITIALIZED'
  | 'DISTRIBUTION_CLOSED'
  | 'ALREADY_CLAIMED'
  | 'DAILY_CLAIM_LIMIT'
  | 'VAULT_INSUFFICIENT'
  | 'INVALID_DEPLOYMENT'
  | 'ELIGIBILITY_SIGNER_MISMATCH'
  | 'TRANSFER_FEE_NOT_ZERO'
  | 'RPC_UNAVAILABLE';

export class GenesisClaimError extends Error {
  constructor(
    readonly code: GenesisClaimErrorCode,
    message: string,
    readonly status: number,
    readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'GenesisClaimError';
  }
}

export interface GenesisClaimStatus {
  configured: boolean;
  closed: boolean;
  alreadyClaimed: boolean;
  claimsToday: number;
  remainingClaimsToday: number;
  vaultBalance: bigint;
  canClaim: boolean;
  config: CommitmentDistributionConfigAccount | null;
}

function protocolRpcUrl(): string {
  const privateUrl = process.env.HELIUS_RPC_URL?.trim();
  const publicUrl = SOLEON_CONFIG.rpcEndpoint?.trim();
  const value = privateUrl || publicUrl;
  if (!value) {
    throw new GenesisClaimError(
      'RPC_UNAVAILABLE',
      'Protocol RPC is not configured.',
      503
    );
  }
  return value;
}

function protocolConnection(): Connection {
  return new Connection(protocolRpcUrl(), 'confirmed');
}

function parseEligibilitySigner(): Keypair {
  try {
    const env = getEligibilitySignerServerEnv();
    const bytes = JSON.parse(env.SOLEON_ELIGIBILITY_SECRET_KEY) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(bytes));
  } catch {
    throw new GenesisClaimError(
      'ELIGIBILITY_SIGNER_MISMATCH',
      'Eligibility signer is not configured correctly.',
      503
    );
  }
}

function currentUtcDay(now = new Date()): number {
  return Math.floor(now.getTime() / 1_000 / SECONDS_PER_DAY);
}

function secondsUntilNextUtcDay(now = new Date()): number {
  const nextUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  return Math.max(1, Math.ceil((nextUtcMidnight - now.getTime()) / 1_000));
}

function assertConfiguredAddress(
  configured: string | null,
  actual: PublicKey,
  label: string
): void {
  if (configured && configured !== actual.toBase58()) {
    throw new GenesisClaimError(
      'INVALID_DEPLOYMENT',
      `${label} does not match the on-chain configuration.`,
      503
    );
  }
}

async function loadClaimStatus(
  owner: PublicKey,
  connection: Connection
): Promise<GenesisClaimStatus> {
  if (!SOLEON_CONFIG.commitmentClaimProgramIdConfigured) {
    return {
      configured: false,
      closed: false,
      alreadyClaimed: false,
      claimsToday: 0,
      remainingClaimsToday: 0,
      vaultBalance: BigInt(0),
      canClaim: false,
      config: null,
    };
  }

  const programId = new PublicKey(SOLEON_CONFIG.commitmentClaimProgramId);
  const [configPda] = deriveCommitmentDistributionConfigPda(programId);
  const [claimReceiptPda] = deriveCommitmentClaimReceiptPda(owner, programId);
  const [configInfo, receiptInfo] = await connection.getMultipleAccountsInfo(
    [configPda, claimReceiptPda],
    'confirmed'
  );
  if (!configInfo) {
    return {
      configured: true,
      closed: false,
      alreadyClaimed: false,
      claimsToday: 0,
      remainingClaimsToday: 0,
      vaultBalance: BigInt(0),
      canClaim: false,
      config: null,
    };
  }
  if (!configInfo.owner.equals(programId)) {
    throw new GenesisClaimError(
      'INVALID_DEPLOYMENT',
      'Distribution config has an invalid owner.',
      503
    );
  }

  const config = decodeCommitmentDistributionConfigAccount(configInfo.data);
  const vaultInfo = await connection.getAccountInfo(
    config.distributionVault,
    'confirmed'
  );
  if (!vaultInfo) {
    throw new GenesisClaimError(
      'INVALID_DEPLOYMENT',
      'Distribution vault does not exist.',
      503
    );
  }
  const vault = unpackAccount(
    config.distributionVault,
    vaultInfo,
    TOKEN_2022_PROGRAM_ID
  );
  if (
    !vault.owner.equals(configPda) ||
    !vault.mint.equals(config.soleonMint)
  ) {
    throw new GenesisClaimError(
      'INVALID_DEPLOYMENT',
      'Distribution vault authority or mint is invalid.',
      503
    );
  }

  assertConfiguredAddress(
    SOLEON_CONFIG.commitmentClaimConfigPda,
    configPda,
    'Distribution config'
  );
  assertConfiguredAddress(
    SOLEON_CONFIG.commitmentClaimVault,
    config.distributionVault,
    'Distribution vault'
  );
  assertConfiguredAddress(SOLEON_CONFIG.soleonMint, config.soleonMint, 'SEON mint');
  assertConfiguredAddress(
    SOLEON_CONFIG.maintenanceFeeReceiver,
    config.maintenanceFeeReceiver,
    'Maintenance fee receiver'
  );

  const today = currentUtcDay();
  if (Number(config.currentUtcDay) > today) {
    throw new GenesisClaimError(
      'INVALID_DEPLOYMENT',
      'On-chain UTC day is ahead of the server clock.',
      503
    );
  }
  const claimsToday =
    Number(config.currentUtcDay) === today ? config.claimsToday : 0;
  const remainingClaimsToday = Math.max(
    0,
    MAX_DAILY_GENESIS_CLAIMS - claimsToday
  );
  const alreadyClaimed = receiptInfo !== null;
  const canClaim =
    !config.closed &&
    !alreadyClaimed &&
    remainingClaimsToday > 0 &&
    vault.amount >= COMMITMENT_CLAIM_AMOUNTS[0];

  return {
    configured: true,
    closed: config.closed,
    alreadyClaimed,
    claimsToday,
    remainingClaimsToday,
    vaultBalance: vault.amount,
    canClaim,
    config,
  };
}

export async function getGenesisClaimStatus(
  owner: PublicKey
): Promise<GenesisClaimStatus> {
  try {
    return await loadClaimStatus(owner, protocolConnection());
  } catch (error) {
    if (error instanceof GenesisClaimError) throw error;
    throw new GenesisClaimError(
      'RPC_UNAVAILABLE',
      'Could not read Genesis Claim state.',
      503
    );
  }
}

export interface SignedGenesisClaimTransaction {
  transactionBase64: string;
  blockhash: string;
  lastValidBlockHeight: number;
  claimAmount: string;
}

export async function buildSignedGenesisClaimTransaction(
  owner: PublicKey
): Promise<SignedGenesisClaimTransaction> {
  const connection = protocolConnection();
  let status: GenesisClaimStatus;
  try {
    status = await loadClaimStatus(owner, connection);
  } catch (error) {
    if (error instanceof GenesisClaimError) throw error;
    throw new GenesisClaimError(
      'RPC_UNAVAILABLE',
      'Could not read Genesis Claim state.',
      503
    );
  }

  if (!status.configured || !status.config) {
    throw new GenesisClaimError(
      'DISTRIBUTION_NOT_INITIALIZED',
      'Genesis Claim is not initialized.',
      503
    );
  }
  if (status.closed) {
    throw new GenesisClaimError(
      'DISTRIBUTION_CLOSED',
      'Genesis Claim is closed.',
      410
    );
  }
  if (status.alreadyClaimed) {
    throw new GenesisClaimError(
      'ALREADY_CLAIMED',
      'This wallet has already claimed.',
      409
    );
  }
  if (status.remainingClaimsToday === 0) {
    throw new GenesisClaimError(
      'DAILY_CLAIM_LIMIT',
      'The daily claim limit has been reached.',
      429,
      secondsUntilNextUtcDay()
    );
  }
  if (status.vaultBalance < COMMITMENT_CLAIM_AMOUNTS[0]) {
    throw new GenesisClaimError(
      'VAULT_INSUFFICIENT',
      'The distribution vault cannot fund another claim.',
      410
    );
  }

  const signer = parseEligibilitySigner();
  if (!signer.publicKey.equals(status.config.eligibilityAuthority)) {
    throw new GenesisClaimError(
      'ELIGIBILITY_SIGNER_MISMATCH',
      'Eligibility signer does not match the on-chain authority.',
      503
    );
  }

  try {
    const [mint, epochInfo] = await Promise.all([
      getMint(
        connection,
        status.config.soleonMint,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      ),
      connection.getEpochInfo('confirmed'),
    ]);
    const transferFeeConfig = getTransferFeeConfig(mint);
    if (
      !transferFeeConfig ||
      calculateEpochFee(
        transferFeeConfig,
        BigInt(epochInfo.epoch),
        COMMITMENT_CLAIM_AMOUNTS[0]
      ) !== BigInt(0)
    ) {
      throw new GenesisClaimError(
        'TRANSFER_FEE_NOT_ZERO',
        'SEON transfer fee must be zero during Genesis Claim.',
        503
      );
    }

    const programId = new PublicKey(SOLEON_CONFIG.commitmentClaimProgramId);
    const transaction = createCommitmentClaimTransaction({
      owner,
      eligibilityAuthority: signer.publicKey,
      distributionConfig: status.config,
      programId,
    });
    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    transaction.feePayer = owner;
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.partialSign(signer);

    return {
      transactionBase64: transaction
        .serialize({
          requireAllSignatures: false,
          verifySignatures: true,
        })
        .toString('base64'),
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      claimAmount: COMMITMENT_CLAIM_AMOUNTS[0].toString(),
    };
  } catch (error) {
    if (error instanceof GenesisClaimError) throw error;
    throw new GenesisClaimError(
      'RPC_UNAVAILABLE',
      'Could not build the Genesis Claim transaction.',
      503
    );
  }
}
