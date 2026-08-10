import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  clusterApiUrl,
  type AccountInfo,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  unpackAccount,
} from '@solana/spl-token';
import {
  SOLEON_CONFIG,
  SEEDS,
  isShortBurnDeployment,
} from './config';
import stakingProgramIdl from './idl/staking_program.json';

// Connection singleton
let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    const endpoint = SOLEON_CONFIG.rpcEndpoint || clusterApiUrl(SOLEON_CONFIG.cluster);
    connection = new Connection(endpoint, 'confirmed');
  }
  return connection;
}

// Program ID
export const PROGRAM_ID = new PublicKey(SOLEON_CONFIG.programId);

// Derive PDAs
export function deriveConfigPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.CONFIG)],
    programId
  );
}

export function deriveStakingVaultPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.STAKING_VAULT)],
    programId
  );
}

export function deriveRewardVaultPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.REWARD_VAULT)],
    programId
  );
}

export function deriveSoleonFeeVaultPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.SOLEON_FEE_VAULT)],
    programId
  );
}

export function deriveStakePositionPda(
  owner: PublicKey,
  positionId: bigint,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const positionIdBuffer = u64(positionId);
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.STAKE_POSITION), owner.toBuffer(), positionIdBuffer],
    programId
  );
}

export function deriveFeeDistributionCallerPda(
  caller: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.FEE_DISTRIBUTION_CALLER), caller.toBuffer()],
    programId
  );
}

// Config account structure (matching Anchor IDL)
export interface ConfigAccount {
  soleonMint: PublicKey;
  stakingVault: PublicKey;
  rewardVault: PublicKey;
  soleonFeeVault: PublicKey;
  launchAuthority: PublicKey;
  maintenanceFeeReceiver: PublicKey;
  protocolStartTime: bigint;
  stakingOpenedTime: bigint;
  rewardYearStartedAt: bigint;
  lastRewardUpdateTime: bigint;
  lastCleanupIncentiveTime: bigint;
  rewardPerTokenQ64: bigint;
  totalStaked: bigint;
  totalRewardsPending: bigint;
  totalRewardsPaid: bigint;
  totalRewardsCompounded: bigint;
  totalRewardsRedistributed: bigint;
  totalCleanupIncentivesPaid: bigint;
  annualRewardBudget: bigint;
  annualRewardsReleased: bigint;
  annualRewardsAccrued: bigint;
  rewardYear: number;
  annualRewardBps: number;
  lastFeeDistributionTime: bigint;
  lastTransferFeeUpdateYear: number;
  stakingOpened: boolean;
  configBump: number;
  stakingVaultBump: number;
  rewardVaultBump: number;
  soleonFeeVaultBump: number;
}

type IdlPrimitive = 'pubkey' | 'i64' | 'u64' | 'u128' | 'u16' | 'bool' | 'u8';

interface IdlField {
  name: string;
  type: IdlPrimitive;
}

interface IdlTypeDef {
  name: string;
  type: {
    kind: 'struct';
    fields: IdlField[];
  };
}

interface IdlAccountDef {
  name: string;
  discriminator: number[];
}

interface IdlInstructionDef {
  name: string;
  discriminator: number[];
}

type SoleonIdl = {
  address: string;
  accounts: IdlAccountDef[];
  instructions: IdlInstructionDef[];
  types: IdlTypeDef[];
};

const STAKING_IDL = stakingProgramIdl as SoleonIdl;

const CONFIG_ACCOUNT_NAME = 'Config';
const STAKE_POSITION_ACCOUNT_NAME = 'StakePosition';

function getIdlType(name: string, idl: SoleonIdl = STAKING_IDL): IdlTypeDef {
  const typeDef = idl.types.find((type) => type.name === name);
  if (!typeDef) {
    throw new Error(`IDL type not found: ${name}`);
  }
  return typeDef;
}

function getAccountDiscriminator(name: string, idl: SoleonIdl = STAKING_IDL): Buffer {
  const accountDef = idl.accounts.find((account) => account.name === name);
  if (!accountDef) {
    throw new Error(`IDL account not found: ${name}`);
  }
  return Buffer.from(accountDef.discriminator);
}

function getInstructionDiscriminator(name: string, idl: SoleonIdl = STAKING_IDL): Buffer {
  const instruction = idl.instructions.find((ix) => ix.name === name);
  if (!instruction) {
    throw new Error(`IDL instruction not found: ${name}`);
  }
  return Buffer.from(instruction.discriminator);
}

function assertDiscriminator(data: Buffer, accountName: string, idl: SoleonIdl = STAKING_IDL): void {
  const expected = getAccountDiscriminator(accountName, idl);
  const actual = data.subarray(0, expected.length);
  if (!actual.equals(expected)) {
    throw new Error(`Invalid ${accountName} account discriminator`);
  }
}

function decodeIdlStruct(data: Buffer, typeName: string, idl: SoleonIdl = STAKING_IDL): Record<string, unknown> {
  const typeDef = getIdlType(typeName, idl);
  let offset = 8; // Anchor account discriminator
  const decoded: Record<string, unknown> = {};

  for (const field of typeDef.type.fields) {
    switch (field.type) {
      case 'pubkey':
        decoded[field.name] = new PublicKey(data.subarray(offset, offset + 32));
        offset += 32;
        break;
      case 'i64':
        decoded[field.name] = data.readBigInt64LE(offset);
        offset += 8;
        break;
      case 'u64':
        decoded[field.name] = data.readBigUInt64LE(offset);
        offset += 8;
        break;
      case 'u128':
        decoded[field.name] =
          data.readBigUInt64LE(offset) +
          (data.readBigUInt64LE(offset + 8) << BigInt(64));
        offset += 16;
        break;
      case 'u16':
        decoded[field.name] = data.readUInt16LE(offset);
        offset += 2;
        break;
      case 'bool':
        decoded[field.name] = data[offset] === 1;
        offset += 1;
        break;
      case 'u8':
        decoded[field.name] = data[offset];
        offset += 1;
        break;
      default:
        throw new Error(`Unsupported IDL field type for ${field.name}`);
    }
  }

  if (data.length < offset) {
    throw new Error(`Account data shorter than IDL layout for ${typeName}`);
  }

  return decoded;
}

// StakePosition account structure
export interface StakePositionAccount {
  owner: PublicKey;
  positionId: bigint;
  amount: bigint;
  lockStartTime: bigint;
  lockEndTime: bigint;
  rewardPerTokenCheckpointQ64: bigint;
  claimedRewards: bigint;
  compoundedRewards: bigint;
  redistributedRewards: bigint;
  renewCount: number;
  rewardRedistributionBps: number;
  isClosed: boolean;
  bump: number;
}

export interface StakePositionRecord {
  pubkey: PublicKey;
  account: StakePositionAccount;
}

// FeeDistributionCaller account structure
export interface FeeDistributionCallerAccount {
  caller: PublicKey;
  lastDistributionTime: bigint;
  bump: number;
}

type HeliusProgramAccountsV2Result = {
  accounts?: Array<{ pubkey: string }>;
  paginationKey?: string | null;
  totalResults?: number;
};

function isUnsupportedRpcError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /unsupported|not found|method not found|invalid params|failed to fetch|excluded from account secondary indexes/i.test(message);
}

async function heliusRpcCommand<T>(method: string, params: unknown[]): Promise<T> {
  const endpoint = SOLEON_CONFIG.rpcEndpoint;
  if (!endpoint) {
    throw new Error('Missing RPC endpoint');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `soleon-${method}-${Date.now()}`,
      method,
      params,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status}`);
  }

  const payload = await response.json() as { result?: T; error?: { message?: string } | string };
  if (payload.error) {
    const message = typeof payload.error === 'string' ? payload.error : payload.error.message ?? 'Unknown RPC error';
    throw new Error(message);
  }

  if (payload.result === undefined) {
    throw new Error('RPC response missing result');
  }

  return payload.result;
}

// Fetch and decode Config account
export async function fetchConfigAccount(): Promise<ConfigAccount | null> {
  const connection = getConnection();
  const [configPda] = deriveConfigPda();
  
  try {
    const accountInfo = await connection.getAccountInfo(configPda);
    if (!accountInfo) return null;
    
    const data = accountInfo.data;
    assertDiscriminator(data, CONFIG_ACCOUNT_NAME);
    const decoded = decodeIdlStruct(data, CONFIG_ACCOUNT_NAME);
    
    return {
      soleonMint: decoded.soleon_mint as PublicKey,
      stakingVault: decoded.staking_vault as PublicKey,
      rewardVault: decoded.reward_vault as PublicKey,
      soleonFeeVault: decoded.soleon_fee_vault as PublicKey,
      launchAuthority: decoded.launch_authority as PublicKey,
      maintenanceFeeReceiver: decoded.maintenance_fee_receiver as PublicKey,
      protocolStartTime: decoded.protocol_start_time as bigint,
      stakingOpenedTime: decoded.staking_opened_time as bigint,
      rewardYearStartedAt: decoded.reward_year_started_at as bigint,
      lastRewardUpdateTime: decoded.last_reward_update_time as bigint,
      lastCleanupIncentiveTime: decoded.last_cleanup_incentive_time as bigint,
      rewardPerTokenQ64: decoded.reward_per_token_q64 as bigint,
      totalStaked: decoded.total_staked as bigint,
      totalRewardsPending: decoded.total_rewards_pending as bigint,
      totalRewardsPaid: decoded.total_rewards_paid as bigint,
      totalRewardsCompounded: decoded.total_rewards_compounded as bigint,
      totalRewardsRedistributed: decoded.total_rewards_redistributed as bigint,
      totalCleanupIncentivesPaid: decoded.total_cleanup_incentives_paid as bigint,
      annualRewardBudget: decoded.annual_reward_budget as bigint,
      annualRewardsReleased: decoded.annual_rewards_released as bigint,
      annualRewardsAccrued: decoded.annual_rewards_accrued as bigint,
      rewardYear: decoded.reward_year as number,
      annualRewardBps: decoded.annual_reward_bps as number,
      lastFeeDistributionTime: decoded.last_fee_distribution_time as bigint,
      lastTransferFeeUpdateYear: decoded.last_transfer_fee_update_year as number,
      stakingOpened: decoded.staking_opened as boolean,
      configBump: decoded.config_bump as number,
      stakingVaultBump: decoded.staking_vault_bump as number,
      rewardVaultBump: decoded.reward_vault_bump as number,
      soleonFeeVaultBump: decoded.soleon_fee_vault_bump as number,
    };
  } catch (error) {
    console.error('[v0] Error fetching config:', error);
    return null;
  }
}

export function decodeStakePositionAccount(data: Buffer): StakePositionAccount {
  assertDiscriminator(data, STAKE_POSITION_ACCOUNT_NAME);
  const decoded = decodeIdlStruct(data, STAKE_POSITION_ACCOUNT_NAME);

  return {
    owner: decoded.owner as PublicKey,
    positionId: decoded.position_id as bigint,
    amount: decoded.amount as bigint,
    lockStartTime: decoded.lock_start_time as bigint,
    lockEndTime: decoded.lock_end_time as bigint,
    rewardPerTokenCheckpointQ64: decoded.reward_per_token_checkpoint_q64 as bigint,
    claimedRewards: decoded.claimed_rewards as bigint,
    compoundedRewards: decoded.compounded_rewards as bigint,
    redistributedRewards: decoded.redistributed_rewards as bigint,
    renewCount: decoded.renew_count as number,
    rewardRedistributionBps: decoded.reward_redistribution_bps as number,
    isClosed: decoded.closed as boolean,
    bump: decoded.bump as number,
  };
}

export async function fetchStakePositionRecords(owner: PublicKey): Promise<StakePositionRecord[]> {
  const connection = getConnection();
  let accounts: Array<{ account: { data: Buffer } } | null> = [];
  let accountPubkeys: PublicKey[] = [];
  let usedV2 = false;
  try {
    if (SOLEON_CONFIG.rpcEndpoint) {
      usedV2 = true;
      let paginationKey: string | null = null;
      const addresses = new Set<string>();

      do {
        const result: HeliusProgramAccountsV2Result = await heliusRpcCommand<HeliusProgramAccountsV2Result>('getProgramAccountsV2', [
          PROGRAM_ID.toBase58(),
          {
            encoding: 'base64',
            filters: [
              { memcmp: { offset: 8, bytes: owner.toBase58() } },
            ],
            limit: 1000,
            ...(paginationKey ? { paginationKey } : {}),
          },
        ]);

        for (const account of result.accounts ?? []) {
          if (account.pubkey) {
            addresses.add(account.pubkey);
          }
        }

        paginationKey = result.paginationKey ?? null;
      } while (paginationKey);

      if (addresses.size > 0) {
        accountPubkeys = [...addresses].map((address) => new PublicKey(address));
        const rawAccounts = await connection.getMultipleAccountsInfo(accountPubkeys, 'confirmed');
        accounts = rawAccounts.map((accountInfo) => {
          if (!accountInfo) return null;
          return {
            account: {
              data: accountInfo.data,
            },
          };
        });
      }
    }
  } catch (error) {
    if (!isUnsupportedRpcError(error)) {
      console.error('[v0] V2 stake position scan failed, falling back:', error);
    }
    usedV2 = false;
  }

  if (!usedV2) {
    const legacyAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { memcmp: { offset: 8, bytes: owner.toBase58() } },
      ],
    });

    accountPubkeys = legacyAccounts.map((account) => account.pubkey);
    accounts = legacyAccounts.map((account) => ({ account: { data: account.account.data } }));
  }

  return accountPubkeys
    .flatMap((pubkey, index) => {
      const account = accounts[index];
      if (!account) return [];
      try {
        return [{
          pubkey,
          account: decodeStakePositionAccount(account.account.data),
        }];
      } catch {
        return [];
      }
    })
    .sort((a, b) => Number(a.account.positionId - b.account.positionId));
}

export async function fetchStakePositions(owner: PublicKey): Promise<StakePositionAccount[]> {
  const records = await fetchStakePositionRecords(owner);
  return records.map((record) => record.account);
}

export async function fetchAllStakePositionRecords(): Promise<StakePositionRecord[]> {
  const connection = getConnection();
  const accounts = await connection.getProgramAccounts(PROGRAM_ID);
  return accounts.flatMap(({ pubkey, account }) => {
    try {
      return [{ pubkey, account: decodeStakePositionAccount(account.data) }];
    } catch {
      return [];
    }
  });
}

export interface WalletSnapshot {
  solBalance: bigint;
  seonBalance: bigint;
  positions: StakePositionRecord[];
}

type MinimalAccountInfo = {
  lamports: number;
  data: Buffer;
  executable: boolean;
  owner: PublicKey;
} | null;

function chunkPublicKeys(keys: PublicKey[], chunkSize = 100): PublicKey[][] {
  const chunks: PublicKey[][] = [];
  for (let index = 0; index < keys.length; index += chunkSize) {
    chunks.push(keys.slice(index, index + chunkSize));
  }
  return chunks;
}

export async function fetchWalletSnapshot(
  owner: PublicKey,
  mint: PublicKey,
  positionRecords: StakePositionRecord[],
): Promise<WalletSnapshot> {
  const connection = getConnection();
  const ata = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID);
  const accountKeys = [owner, ata, ...positionRecords.map((record) => record.pubkey)];
  const rawAccounts: MinimalAccountInfo[] = [];
  for (const chunk of chunkPublicKeys(accountKeys)) {
    const chunkAccounts = await connection.getMultipleAccountsInfo(chunk, 'confirmed');
    rawAccounts.push(...chunkAccounts);
  }

  const walletInfo = rawAccounts[0] ?? null;
  const ataInfo = rawAccounts[1] ?? null;
  const positionInfos = rawAccounts.slice(2);

  const solBalance = BigInt(walletInfo?.lamports ?? 0);
  let seonBalance = BigInt(0);
  if (ataInfo) {
    try {
      seonBalance = unpackAccount(ata, ataInfo as AccountInfo<Buffer>, TOKEN_2022_PROGRAM_ID).amount;
    } catch {
      seonBalance = BigInt(0);
    }
  }

  const positions = positionInfos.flatMap((accountInfo, index) => {
    if (!accountInfo) return [];
    try {
      const record = positionRecords[index];
      if (!record) return [];
      return [{
        pubkey: record.pubkey,
        account: decodeStakePositionAccount(accountInfo.data),
      }];
    } catch {
      return [];
    }
  });

  return {
    solBalance,
    seonBalance,
    positions,
  };
}

export function estimateClaimableRewards(
  position: StakePositionAccount,
  rewardPerTokenQ64: bigint = BigInt(0),
): bigint {
  if (position.isClosed || position.amount <= BigInt(0)) return BigInt(0);
  if (rewardPerTokenQ64 <= position.rewardPerTokenCheckpointQ64) return BigInt(0);
  return position.amount *
    (rewardPerTokenQ64 - position.rewardPerTokenCheckpointQ64) /
    (BigInt(1) << BigInt(64));
}

export function projectRewardPerTokenQ64(
  config: ConfigAccount,
  nowSeconds = Math.floor(Date.now() / 1000),
): bigint {
  if (!config.stakingOpened || config.totalStaked <= BigInt(0)) {
    return config.rewardPerTokenQ64;
  }
  const secondsPerYear = BigInt(365 * 24 * 60 * 60);
  const now = BigInt(nowSeconds);
  const yearEnd = config.rewardYearStartedAt + secondsPerYear;
  const segmentEnd = now < yearEnd ? now : yearEnd;
  if (segmentEnd <= config.lastRewardUpdateTime) return config.rewardPerTokenQ64;
  const releasedTarget =
    config.annualRewardBudget *
    (segmentEnd - config.rewardYearStartedAt) /
    secondsPerYear;
  const newlyReleased = releasedTarget > config.annualRewardsReleased
    ? releasedTarget - config.annualRewardsReleased
    : BigInt(0);
  return config.rewardPerTokenQ64 +
    (newlyReleased << BigInt(64)) / config.totalStaked;
}

export async function fetchWalletTokenBalance(owner: PublicKey, mint: PublicKey): Promise<bigint> {
  const connection = getConnection();
  const tokenAccount = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID);

  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return BigInt(balance.value.amount);
  } catch {
    return BigInt(0);
  }
}

export function parseTokenAmount(amount: string, decimals: number = 9): bigint {
  const normalized = amount.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Invalid token amount');
  }

  const [whole, rawFraction = ''] = normalized.split('.');
  const fraction = rawFraction.slice(0, decimals).padEnd(decimals, '0');
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(fraction);
}

function u64(value: bigint): Buffer {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setBigUint64(0, value, true);
  return Buffer.from(buffer);
}

export function createStakeTransaction(params: {
  owner: PublicKey;
  config: ConfigAccount;
  amount: bigint;
  positionId?: bigint;
  programId?: PublicKey;
}): Transaction {
  const positionId = params.positionId ?? BigInt(Date.now());
  const programId = params.programId ?? PROGRAM_ID;
  const [configPda] = deriveConfigPda(programId);
  const [stakePositionPda] = deriveStakePositionPda(params.owner, positionId, programId);
  const ownerTokenAccount = getAssociatedTokenAddressSync(params.config.soleonMint, params.owner, false, TOKEN_2022_PROGRAM_ID);
  const data = Buffer.concat([
    getInstructionDiscriminator('stake'),
    u64(positionId),
    u64(params.amount),
  ]);

  return new Transaction().add(
    new TransactionInstruction({
      programId,
      keys: [
        { pubkey: params.owner, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: stakePositionPda, isSigner: false, isWritable: true },
        { pubkey: params.config.soleonMint, isSigner: false, isWritable: false },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: params.config.stakingVault, isSigner: false, isWritable: true },
        { pubkey: params.config.rewardVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    })
  );
}

function createAtaSetupTransaction(
  payer: PublicKey,
  owner: PublicKey,
  mint: PublicKey
): Transaction {
  const ownerTokenAccount = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID);
  return new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      payer,
      ownerTokenAccount,
      owner,
      mint,
      TOKEN_2022_PROGRAM_ID
    )
  );
}

export function createClaimRewardsTransaction(params: {
  owner: PublicKey;
  config: ConfigAccount;
  positionId: bigint;
  programId?: PublicKey;
}): Transaction {
  const programId = params.programId ?? PROGRAM_ID;
  const [configPda] = deriveConfigPda(programId);
  const [stakePositionPda] = deriveStakePositionPda(params.owner, params.positionId, programId);
  const ownerTokenAccount = getAssociatedTokenAddressSync(
    params.config.soleonMint,
    params.owner,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  return createAtaSetupTransaction(params.owner, params.owner, params.config.soleonMint).add(
    new TransactionInstruction({
      programId,
      keys: [
        { pubkey: params.owner, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: stakePositionPda, isSigner: false, isWritable: true },
        { pubkey: params.config.soleonMint, isSigner: false, isWritable: false },
        { pubkey: params.config.rewardVault, isSigner: false, isWritable: true },
        { pubkey: params.config.maintenanceFeeReceiver, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: getInstructionDiscriminator('claim_rewards'),
    })
  );
}

export function createUnstakeExpiredTransaction(params: {
  caller: PublicKey;
  owner: PublicKey;
  config: ConfigAccount;
  positionId: bigint;
  programId?: PublicKey;
}): Transaction {
  const programId = params.programId ?? PROGRAM_ID;
  const [configPda] = deriveConfigPda(programId);
  const [stakePositionPda] = deriveStakePositionPda(params.owner, params.positionId, programId);
  const ownerTokenAccount = getAssociatedTokenAddressSync(
    params.config.soleonMint,
    params.owner,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  return createAtaSetupTransaction(params.caller, params.owner, params.config.soleonMint).add(
    new TransactionInstruction({
      programId,
      keys: [
        { pubkey: params.caller, isSigner: true, isWritable: true },
        { pubkey: params.owner, isSigner: false, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: stakePositionPda, isSigner: false, isWritable: true },
        { pubkey: params.config.soleonMint, isSigner: false, isWritable: false },
        { pubkey: params.config.stakingVault, isSigner: false, isWritable: true },
        { pubkey: params.config.rewardVault, isSigner: false, isWritable: true },
        { pubkey: params.config.maintenanceFeeReceiver, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: getInstructionDiscriminator('unstake_expired'),
    })
  );
}

export function createRenewExpiredPositionTransaction(params: {
  owner: PublicKey;
  config: ConfigAccount;
  oldPositionId: bigint;
  newPositionId?: bigint;
  programId?: PublicKey;
}): Transaction {
  const programId = params.programId ?? PROGRAM_ID;
  const [configPda] = deriveConfigPda(programId);
  const [oldStakePositionPda] = deriveStakePositionPda(params.owner, params.oldPositionId, programId);
  const newPositionId = params.newPositionId ?? BigInt(Date.now());
  const [newStakePositionPda] = deriveStakePositionPda(params.owner, newPositionId, programId);

  return new Transaction().add(
    new TransactionInstruction({
      programId,
      keys: [
        { pubkey: params.owner, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: oldStakePositionPda, isSigner: false, isWritable: true },
        { pubkey: newStakePositionPda, isSigner: false, isWritable: true },
        { pubkey: params.config.soleonMint, isSigner: false, isWritable: false },
        { pubkey: params.config.rewardVault, isSigner: false, isWritable: true },
        { pubkey: params.config.stakingVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        getInstructionDiscriminator('renew_expired_position'),
        u64(newPositionId),
      ]),
    })
  );
}

export function createCleanupExpiredPositionsTransaction(params: {
  caller: PublicKey;
  config: ConfigAccount;
  positions: Array<{
    pubkey: PublicKey;
    owner: PublicKey;
  }>;
  programId?: PublicKey;
}): Transaction {
  const programId = params.programId ?? PROGRAM_ID;
  const [configPda] = deriveConfigPda(programId);
  const callerTokenAccount = getAssociatedTokenAddressSync(
    params.config.soleonMint,
    params.caller,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  const transaction = createAtaSetupTransaction(
    params.caller,
    params.caller,
    params.config.soleonMint
  );

  return transaction.add(
    new TransactionInstruction({
      programId,
      keys: [
        { pubkey: params.caller, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: params.config.soleonMint, isSigner: false, isWritable: false },
        { pubkey: params.config.stakingVault, isSigner: false, isWritable: true },
        { pubkey: params.config.rewardVault, isSigner: false, isWritable: true },
        { pubkey: callerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        ...params.positions.flatMap(({ pubkey, owner }) => [
          { pubkey, isSigner: false, isWritable: true },
          { pubkey: owner, isSigner: false, isWritable: true },
          {
            pubkey: getAssociatedTokenAddressSync(
              params.config.soleonMint,
              owner,
              false,
              TOKEN_2022_PROGRAM_ID
            ),
            isSigner: false,
            isWritable: true,
          },
        ]),
      ],
      data: getInstructionDiscriminator('cleanup_expired_positions'),
    })
  );
}

export function createUpdateTransferFeeTransaction(
  caller: PublicKey,
  config: ConfigAccount,
  programId: PublicKey = PROGRAM_ID
): Transaction {
  const [configPda] = deriveConfigPda(programId);

  return new Transaction().add(
    new TransactionInstruction({
      programId,
      keys: [
        { pubkey: caller, isSigner: true, isWritable: false },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: config.soleonMint, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: getInstructionDiscriminator('update_transfer_fee'),
    })
  );
}

export function createWithdrawAndDistributeFromMintTransaction(
  caller: PublicKey,
  config: ConfigAccount,
  programId: PublicKey = PROGRAM_ID
): Transaction {
  const [configPda] = deriveConfigPda(programId);
  const [feeDistributionCallerPda] = deriveFeeDistributionCallerPda(caller, programId);
  const callerTokenAccount = getAssociatedTokenAddressSync(config.soleonMint, caller, false, TOKEN_2022_PROGRAM_ID);

  return new Transaction()
    .add(
      createAssociatedTokenAccountIdempotentInstruction(
        caller,
        callerTokenAccount,
        caller,
        config.soleonMint,
        TOKEN_2022_PROGRAM_ID
      )
    )
    .add(
      new TransactionInstruction({
        programId,
        keys: [
          { pubkey: caller, isSigner: true, isWritable: true },
          { pubkey: configPda, isSigner: false, isWritable: true },
          { pubkey: feeDistributionCallerPda, isSigner: false, isWritable: true },
          { pubkey: config.soleonMint, isSigner: false, isWritable: true },
          { pubkey: config.soleonFeeVault, isSigner: false, isWritable: true },
          { pubkey: config.rewardVault, isSigner: false, isWritable: true },
          { pubkey: callerTokenAccount, isSigner: false, isWritable: true },
          { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: getInstructionDiscriminator('withdraw_and_distribute_from_mint'),
      })
    );
}

// Fetch token account balance
export async function fetchTokenBalance(
  tokenAccount: PublicKey
): Promise<bigint | null> {
  const connection = getConnection();
  
  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return BigInt(balance.value.amount);
  } catch (error) {
    console.error('[v0] Error fetching token balance:', error);
    return null;
  }
}

export function calculateMaxLockDays(_protocolStartTime: bigint, _shortBurn = isShortBurnDeployment()): number {
  return 7;
}

export function calculateMaxLockDaysExact(_protocolStartTime: bigint, _shortBurn = isShortBurnDeployment()): number {
  return 7;
}

function formatWholeWithCommas(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatTinyTokenAmount(amount: bigint, decimals: number): string {
  const subscriptDigits = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  const negative = amount < BigInt(0);
  const absolute = negative ? -amount : amount;
  const fraction = absolute.toString().padStart(decimals, '0').replace(/0+$/, '');
  const firstDigitIndex = fraction.search(/[1-9]/);

  if (firstDigitIndex === -1) {
    return '0.00';
  }

  const significant = fraction.slice(firstDigitIndex, firstDigitIndex + 4);
  const subscriptZeroCount = String(firstDigitIndex)
    .split('')
    .map((digit) => subscriptDigits[Number(digit)])
    .join('');
  return `${negative ? '-' : ''}0.0${subscriptZeroCount}${significant}`;
}

// Format token amount with 2 decimals. Tiny non-zero values use subscript-zero notation.
export function formatTokenAmount(amount: bigint, decimals: number = 9): string {
  const divisor = BigInt(10 ** decimals);
  const negative = amount < BigInt(0);
  const absolute = negative ? -amount : amount;

  if (absolute === BigInt(0)) {
    return '0.00';
  }

  if (absolute < divisor / BigInt(100)) {
    return formatTinyTokenAmount(amount, decimals);
  }

  const scaled = (absolute * BigInt(100) + divisor / BigInt(2)) / divisor;
  const whole = scaled / BigInt(100);
  const fraction = scaled % BigInt(100);
  const prefix = negative ? '-' : '';

  return `${prefix}${formatWholeWithCommas(whole)}.${fraction.toString().padStart(2, '0')}`;
}
