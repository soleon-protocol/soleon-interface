// Soleon Protocol Configuration
// This file contains deployment-specific addresses and settings

const UNCONFIGURED_PROGRAM_ID = '11111111111111111111111111111111';
const DEFAULT_PUBLIC_CLUSTER: SoleonConfig['cluster'] = 'mainnet-beta';
const DEFAULT_PUBLIC_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

export type WebPhase = 
  | 'pre_launch'      // Before initial launch
  | 'genesis_active'  // Initial distribution active
  | 'markets_live'    // Verifiable DEX market addresses published
  | 'staking_live'    // On-chain staking active
  | 'immutable';      // All authorities revoked

export interface SoleonConfig {
  // Cluster
  cluster: 'devnet' | 'mainnet-beta';
  rpcEndpoint: string | null;
  
  // Program
  programId: string;
  programIdConfigured: boolean;

  maintenanceFeeReceiver: string | null;
  
  // Token (SEON) - null until created
  soleonMint: string | null;
  
  // PDAs - derived from program
  configPda: string | null;
  stakingVault: string | null;
  rewardVault: string | null;
  soleonFeeVault: string | null;
  
  // Fund wallets (public, verifiable)
  creatorAllocationWallet: string | null;
  genesisDistributionWallet: string | null;
  genesisDistributionTokenAccount: string | null;
  marketLiquidityWallet: string | null;
  marketLiquidityTokenAccount: string | null;
  genesisSelectionRulesUrl: string | null;
  genesisReportsUrl: string | null;
  securityReportUrl: string | null;
  stakingRepositoryUrl: string | null;
  
  // Web phase and status
  currentPhase: WebPhase;
  
  // Feature flags
  jupiterEnabled: boolean;
  stakingEnabled: boolean;
  stakingTransactionsEnabled: boolean;
  maintenanceActionsEnabled: boolean;
  testShortBurn: boolean;
  
  // Launch dates
  genesisLaunchDate: string; // ISO date
  estimatedMainnetLaunch: string | null;
}

const WEB_PHASES: WebPhase[] = [
  'pre_launch',
  'genesis_active',
  'markets_live',
  'staking_live',
  'immutable',
];

const PUBLIC_ENV: Record<string, string | undefined> = {
  NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
  NEXT_PUBLIC_SOLANA_RPC_ENDPOINT: process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT,
  NEXT_PUBLIC_SOLEON_PROGRAM_ID: process.env.NEXT_PUBLIC_SOLEON_PROGRAM_ID,
  NEXT_PUBLIC_MAINTENANCE_FEE_RECEIVER: process.env.NEXT_PUBLIC_MAINTENANCE_FEE_RECEIVER,
  NEXT_PUBLIC_SOLEON_MINT: process.env.NEXT_PUBLIC_SOLEON_MINT,
  NEXT_PUBLIC_SOLEON_CONFIG_PDA: process.env.NEXT_PUBLIC_SOLEON_CONFIG_PDA,
  NEXT_PUBLIC_SOLEON_STAKING_VAULT: process.env.NEXT_PUBLIC_SOLEON_STAKING_VAULT,
  NEXT_PUBLIC_SOLEON_REWARD_VAULT: process.env.NEXT_PUBLIC_SOLEON_REWARD_VAULT,
  NEXT_PUBLIC_SOLEON_FEE_VAULT: process.env.NEXT_PUBLIC_SOLEON_FEE_VAULT,
  NEXT_PUBLIC_CREATOR_ALLOCATION_WALLET: process.env.NEXT_PUBLIC_CREATOR_ALLOCATION_WALLET,
  NEXT_PUBLIC_GENESIS_DISTRIBUTION_WALLET: process.env.NEXT_PUBLIC_GENESIS_DISTRIBUTION_WALLET,
  NEXT_PUBLIC_GENESIS_DISTRIBUTION_TOKEN_ACCOUNT: process.env.NEXT_PUBLIC_GENESIS_DISTRIBUTION_TOKEN_ACCOUNT,
  NEXT_PUBLIC_MARKET_LIQUIDITY_WALLET: process.env.NEXT_PUBLIC_MARKET_LIQUIDITY_WALLET,
  NEXT_PUBLIC_MARKET_LIQUIDITY_TOKEN_ACCOUNT: process.env.NEXT_PUBLIC_MARKET_LIQUIDITY_TOKEN_ACCOUNT,
  NEXT_PUBLIC_GENESIS_SELECTION_RULES_URL: process.env.NEXT_PUBLIC_GENESIS_SELECTION_RULES_URL,
  NEXT_PUBLIC_GENESIS_REPORTS_URL: process.env.NEXT_PUBLIC_GENESIS_REPORTS_URL,
  NEXT_PUBLIC_STAKING_REPOSITORY_URL: process.env.NEXT_PUBLIC_STAKING_REPOSITORY_URL,
  NEXT_PUBLIC_SOLEON_PHASE: process.env.NEXT_PUBLIC_SOLEON_PHASE,
  NEXT_PUBLIC_JUPITER_ENABLED: process.env.NEXT_PUBLIC_JUPITER_ENABLED,
  NEXT_PUBLIC_STAKING_ENABLED: process.env.NEXT_PUBLIC_STAKING_ENABLED,
  NEXT_PUBLIC_STAKING_TRANSACTIONS_ENABLED: process.env.NEXT_PUBLIC_STAKING_TRANSACTIONS_ENABLED,
  NEXT_PUBLIC_MAINTENANCE_ACTIONS_ENABLED: process.env.NEXT_PUBLIC_MAINTENANCE_ACTIONS_ENABLED,
  NEXT_PUBLIC_TEST_SHORT_BURN: process.env.NEXT_PUBLIC_TEST_SHORT_BURN,
  NEXT_PUBLIC_GENESIS_LAUNCH_DATE: process.env.NEXT_PUBLIC_GENESIS_LAUNCH_DATE,
  NEXT_PUBLIC_ESTIMATED_MAINNET_LAUNCH: process.env.NEXT_PUBLIC_ESTIMATED_MAINNET_LAUNCH,
};

function optionalEnv(name: string): string | null {
  const value = PUBLIC_ENV[name];
  return value && value.trim() !== '' ? value.trim() : null;
}

function readCluster(): SoleonConfig['cluster'] {
  const value = optionalEnv('NEXT_PUBLIC_SOLANA_CLUSTER');
  if (value === null) {
    return DEFAULT_PUBLIC_CLUSTER;
  }
  if (value === 'devnet' || value === 'mainnet-beta') return value;
  throw new Error('NEXT_PUBLIC_SOLANA_CLUSTER must be devnet or mainnet-beta');
}

function readWebPhase(): WebPhase {
  const value = optionalEnv('NEXT_PUBLIC_SOLEON_PHASE') as WebPhase | null;
  if (value === null) return 'pre_launch';
  if (WEB_PHASES.includes(value)) return value;
  throw new Error(`Invalid NEXT_PUBLIC_SOLEON_PHASE: ${value}`);
}

function readBoolean(name: string, fallback: boolean): boolean {
  const value = optionalEnv(name);
  if (value === null) return fallback;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new Error(`${name} must be true, false, 1 or 0`);
}

const configuredProgramId = optionalEnv('NEXT_PUBLIC_SOLEON_PROGRAM_ID');

// Current configuration. Public NEXT_PUBLIC_* env vars override these defaults.
// Defaults intentionally point to an unconfigured/pre-launch state so the
// website cannot imply readiness before addresses and phases are published.
export const SOLEON_CONFIG: SoleonConfig = {
  cluster: readCluster(),
  rpcEndpoint: optionalEnv('NEXT_PUBLIC_SOLANA_RPC_ENDPOINT') ?? DEFAULT_PUBLIC_RPC_ENDPOINT,
  
  // Program ID must come from env for protocol reads. The placeholder is
  // only used so PDA helpers can stay pure while Step 0 has no program yet.
  programId: configuredProgramId ?? UNCONFIGURED_PROGRAM_ID,
  programIdConfigured: configuredProgramId !== null,

  maintenanceFeeReceiver: optionalEnv('NEXT_PUBLIC_MAINTENANCE_FEE_RECEIVER'),
  
  // SEON Token - null until created/published
  soleonMint: optionalEnv('NEXT_PUBLIC_SOLEON_MINT'),
  
  // PDAs - usually derived by the client, env vars are display/override metadata
  configPda: optionalEnv('NEXT_PUBLIC_SOLEON_CONFIG_PDA'),
  stakingVault: optionalEnv('NEXT_PUBLIC_SOLEON_STAKING_VAULT'),
  rewardVault: optionalEnv('NEXT_PUBLIC_SOLEON_REWARD_VAULT'),
  soleonFeeVault: optionalEnv('NEXT_PUBLIC_SOLEON_FEE_VAULT'),
  
  // Fund wallets - will be public addresses
  creatorAllocationWallet: optionalEnv('NEXT_PUBLIC_CREATOR_ALLOCATION_WALLET'),
  genesisDistributionWallet: optionalEnv('NEXT_PUBLIC_GENESIS_DISTRIBUTION_WALLET'),
  genesisDistributionTokenAccount: optionalEnv('NEXT_PUBLIC_GENESIS_DISTRIBUTION_TOKEN_ACCOUNT'),
  marketLiquidityWallet: optionalEnv('NEXT_PUBLIC_MARKET_LIQUIDITY_WALLET'),
  marketLiquidityTokenAccount: optionalEnv('NEXT_PUBLIC_MARKET_LIQUIDITY_TOKEN_ACCOUNT'),
  genesisSelectionRulesUrl: optionalEnv('NEXT_PUBLIC_GENESIS_SELECTION_RULES_URL'),
  genesisReportsUrl: optionalEnv('NEXT_PUBLIC_GENESIS_REPORTS_URL'),
  securityReportUrl: null,
  stakingRepositoryUrl: optionalEnv('NEXT_PUBLIC_STAKING_REPOSITORY_URL'),
  
  // Current phase
  currentPhase: readWebPhase(),
  
  // Features disabled until ready
  jupiterEnabled: readBoolean('NEXT_PUBLIC_JUPITER_ENABLED', false),
  stakingEnabled: readBoolean('NEXT_PUBLIC_STAKING_ENABLED', false),
  stakingTransactionsEnabled: readBoolean('NEXT_PUBLIC_STAKING_TRANSACTIONS_ENABLED', false),
  maintenanceActionsEnabled: readBoolean('NEXT_PUBLIC_MAINTENANCE_ACTIONS_ENABLED', false),
  testShortBurn: readBoolean('NEXT_PUBLIC_TEST_SHORT_BURN', false),
  
  // Dates
  genesisLaunchDate: optionalEnv('NEXT_PUBLIC_GENESIS_LAUNCH_DATE') ?? '2026-08-31T12:00:00Z',
  estimatedMainnetLaunch: optionalEnv('NEXT_PUBLIC_ESTIMATED_MAINNET_LAUNCH'),
};

export const SHORT_BURN_PROGRAM_IDS = new Set<string>([
  // Devnet rehearsal program deployed with the contract's test-short-burn feature.
  'FufmDrm4SBqUBFzobkqGuV28XnascAT3PaGwB8k7HrDP',
]);

export function isShortBurnDeployment(programId: string = SOLEON_CONFIG.programId): boolean {
  return SOLEON_CONFIG.testShortBurn || SHORT_BURN_PROGRAM_IDS.has(programId);
}

// Token constants
// EXACT supply allocation - no extra tokens needed since fee starts at 0%
export const SEON_DECIMALS = 9;
export const SEON_TOTAL_SUPPLY = 444_444_444; // Exactly 444,444,444 SEON
export const SEON_REWARD_VAULT_INITIAL = 440_000_000; // 440M to reward vault
export const SEON_CREATOR_ALLOCATION = 44_444; // 44,444 transparent initial developer allocation
export const SEON_GENESIS_AIRDROP_ALLOCATION = 4_000_000;
export const SEON_MARKET_LIQUIDITY_ALLOCATION = 400_000;
export const SEON_GENESIS_WALLET_AMOUNT = 10_000;
export const GENESIS_WAVE_COUNT = 10;
export const GENESIS_WALLETS_PER_WAVE = 40;
export const GENESIS_RECIPIENT_COUNT = GENESIS_WAVE_COUNT * GENESIS_WALLETS_PER_WAVE;

// Dynamic Transfer Fee constants
// Mint starts at 0%. Once staking opens, a permissionless update activates
// 0.02%; each completed staking-live year then adds another 0.02 points.
export const INITIAL_TRANSFER_FEE_BPS = 0; // 0% at creation
export const TRANSFER_FEE_INCREMENT_BPS = 2; // 0.02% at staking open, then +0.02% per year
export const MAX_TRANSFER_FEE_BPS = 40; // 0.4% maximum
export const MAX_TRANSFER_FEE = 400; // 400 SEON absolute cap

// Fee distribution (from withdrawAndDistributeFromMint)
// New rules: caller gets FIXED 1 SEON, burn is 20%, rest to reward vault
export const FEE_BURNED_PERCENT = 20;
export const CALLER_REWARD_FIXED = 1; // Fixed 1 SEON reward to caller
export const MIN_FEES_TO_DISTRIBUTE = 200; // Minimum 200 SEON to execute
export const GLOBAL_COOLDOWN_HOURS = 1; // 1 hour global cooldown
export const CALLER_COOLDOWN_HOURS = 24; // 24 hours per wallet cooldown

// Staking constants
export const LOCK_DAYS = 7;
export const GRACE_PERIOD_DAYS = 3;
export const INITIAL_REWARD_REDISTRIBUTION_BPS = 1_000;
export const RENEW_REDISTRIBUTION_REDUCTION_BPS = 50;
export const CLEANUP_CALLER_REWARD = 1;
export const MAX_CLEANUP_BATCH_SIZE = 4;

// Time constants
export const FEE_DISTRIBUTION_GLOBAL_COOLDOWN_SECONDS = GLOBAL_COOLDOWN_HOURS * 60 * 60;
export const FEE_DISTRIBUTION_CALLER_COOLDOWN_SECONDS = CALLER_COOLDOWN_HOURS * 60 * 60;

// PDA Seeds
export const SEEDS = {
  CONFIG: 'config',
  STAKING_VAULT: 'staking-vault',
  REWARD_VAULT: 'reward-vault',
  SOLEON_FEE_VAULT: 'soleon-fee-vault',
  STAKE_POSITION: 'stake-position',
  FEE_DISTRIBUTION_CALLER: 'fee-distribution-caller',
} as const;
