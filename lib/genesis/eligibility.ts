import eligibilityRules from '@/lib/genesis/eligibility-rules-v1.json';

export const ELIGIBILITY_RULES = eligibilityRules;
export const ELIGIBILITY_RULES_SHA256 =
  '449d8fe5dfd5c651fdef4807b47baa44c0d6285ff9ee2e1a6f6bc745586d6d09';

export const ELIGIBILITY_SIGNATURE_PAGE_SIZE = 1_000;
export const ELIGIBILITY_MAX_SIGNATURE_PAGES = 10;
export const ELIGIBILITY_TRANSACTION_BATCH_SIZE = 25;
export const ELIGIBILITY_MAX_TRANSACTION_DETAILS = 120;

const DAY_SECONDS = 24 * 60 * 60;
const COMPUTE_BUDGET_PROGRAM_ID = 'ComputeBudget111111111111111111111111111111';
const VOTE_PROGRAM_ID = 'Vote111111111111111111111111111111111111111';
const MEMO_PROGRAM_IDS = new Set([
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
]);

export type EligibilityStatus = 'eligible' | 'ineligible' | 'unavailable';

export type EligibilityReasonCode =
  | 'ACCOUNT_HISTORY_LT_90_DAYS'
  | 'VALID_TRANSACTIONS_LT_20'
  | 'ACTIVE_DAYS_LT_5'
  | 'ACTIVE_MONTHS_LT_3'
  | 'NO_RECENT_ACTIVITY'
  | 'RPC_UNAVAILABLE'
  | 'EVALUATION_BUDGET_EXCEEDED'
  | 'HISTORY_TRUNCATED';

export interface EligibilitySignature {
  signature: string;
  blockTime: number | null;
  err: unknown | null;
}

type TransactionAccountKey =
  | string
  | {
      pubkey: string;
      signer?: boolean;
    };

type TransactionInstruction = {
  programId?: string;
  programIdIndex?: number;
};

export interface EligibilityTransaction {
  blockTime: number | null;
  meta: {
    err: unknown | null;
  } | null;
  transaction: {
    message: {
      accountKeys: TransactionAccountKey[];
      header?: {
        numRequiredSignatures: number;
      };
      instructions: TransactionInstruction[];
    };
  };
}

export interface EligibilityTransactionLookup {
  signature: string;
  transaction: EligibilityTransaction | null;
  unavailable?: boolean;
}

export interface EligibilityDataSource {
  listSignatures(params: {
    wallet: string;
    before?: string;
    limit: number;
  }): Promise<EligibilitySignature[]>;
  getTransactions(signatures: string[]): Promise<EligibilityTransactionLookup[]>;
}

export interface EligibilityMetrics {
  validTransactionCount: number;
  distinctActiveDays: number;
  distinctActiveMonths: number;
  accountHistoryDays: number | null;
  daysSinceRecentActivity: number | null;
  signaturesScanned: number;
  transactionsFetched: number;
  estimatedRpcCredits: number;
}

export interface EligibilityEvaluation {
  status: EligibilityStatus;
  wallet: string;
  evaluatedAt: string;
  rulesVersion: number;
  rulesHash: string;
  reasonCodes: EligibilityReasonCode[];
  metrics: EligibilityMetrics;
}

type MutableEvidence = {
  validSignatures: Set<string>;
  activeDays: Set<string>;
  activeMonths: Set<string>;
  oldestBlockTime: number | null;
  newestBlockTime: number | null;
};

function accountKeyString(key: TransactionAccountKey): string {
  return typeof key === 'string' ? key : String(key.pubkey);
}

function walletIsSigner(transaction: EligibilityTransaction, wallet: string): boolean {
  const { accountKeys, header } = transaction.transaction.message;
  return accountKeys.some((key, index) => {
    if (accountKeyString(key) !== wallet) return false;
    if (typeof key !== 'string') return key.signer === true;
    return index < (header?.numRequiredSignatures ?? 0);
  });
}

function instructionProgramId(
  instruction: TransactionInstruction,
  accountKeys: TransactionAccountKey[]
): string | null {
  if (instruction.programId) return String(instruction.programId);
  if (
    typeof instruction.programIdIndex === 'number' &&
    instruction.programIdIndex >= 0 &&
    instruction.programIdIndex < accountKeys.length
  ) {
    return accountKeyString(accountKeys[instruction.programIdIndex]);
  }
  return null;
}

function validTransactionBlockTime(
  transaction: EligibilityTransaction,
  wallet: string
): number | null | 'unavailable' {
  if (!transaction.meta || transaction.meta.err !== null) return null;
  if (transaction.blockTime === null || !Number.isFinite(transaction.blockTime)) return null;
  if (!walletIsSigner(transaction, wallet)) return null;

  const { accountKeys, instructions } = transaction.transaction.message;
  if (!Array.isArray(instructions) || instructions.length === 0) return null;

  let unresolvedInstruction = false;
  for (const instruction of instructions) {
    const programId = instructionProgramId(instruction, accountKeys);
    if (!programId) {
      unresolvedInstruction = true;
      continue;
    }
    if (
      programId !== COMPUTE_BUDGET_PROGRAM_ID &&
      programId !== VOTE_PROGRAM_ID &&
      !MEMO_PROGRAM_IDS.has(programId)
    ) {
      return transaction.blockTime;
    }
  }

  return unresolvedInstruction ? 'unavailable' : null;
}

function utcDay(blockTime: number): string {
  return new Date(blockTime * 1_000).toISOString().slice(0, 10);
}

function utcMonth(blockTime: number): string {
  return new Date(blockTime * 1_000).toISOString().slice(0, 7);
}

function addEvidence(
  evidence: MutableEvidence,
  signature: string,
  blockTime: number
): void {
  if (evidence.validSignatures.has(signature)) return;
  evidence.validSignatures.add(signature);
  evidence.activeDays.add(utcDay(blockTime));
  evidence.activeMonths.add(utcMonth(blockTime));
  evidence.oldestBlockTime =
    evidence.oldestBlockTime === null
      ? blockTime
      : Math.min(evidence.oldestBlockTime, blockTime);
  evidence.newestBlockTime =
    evidence.newestBlockTime === null
      ? blockTime
      : Math.max(evidence.newestBlockTime, blockTime);
}

function evidenceMeetsRules(evidence: MutableEvidence, nowSeconds: number): boolean {
  return (
    evidence.validSignatures.size >= eligibilityRules.minimumValidTransactions &&
    evidence.activeDays.size >= eligibilityRules.minimumDistinctUtcDays &&
    evidence.activeMonths.size >= eligibilityRules.minimumDistinctCalendarMonths &&
    evidence.oldestBlockTime !== null &&
    nowSeconds - evidence.oldestBlockTime >=
      eligibilityRules.minimumAccountHistoryDays * DAY_SECONDS &&
    evidence.newestBlockTime !== null &&
    nowSeconds - evidence.newestBlockTime <= eligibilityRules.recentActivityDays * DAY_SECONDS
  );
}

function shouldAdvanceToOlderPage(params: {
  evidence: MutableEvidence;
  page: EligibilitySignature[];
  nowSeconds: number;
}): boolean {
  if (params.page.length < ELIGIBILITY_SIGNATURE_PAGE_SIZE) return false;
  const hasCountDaysAndRecent =
    params.evidence.validSignatures.size >= eligibilityRules.minimumValidTransactions &&
    params.evidence.activeDays.size >= eligibilityRules.minimumDistinctUtcDays &&
    params.evidence.newestBlockTime !== null &&
    params.nowSeconds - params.evidence.newestBlockTime <=
      eligibilityRules.recentActivityDays * DAY_SECONDS;
  if (!hasCountDaysAndRecent) return false;

  const successfulTimes = params.page
    .filter((item) => item.err === null && item.blockTime !== null)
    .map((item) => item.blockTime!);
  const oldCutoff =
    params.nowSeconds - eligibilityRules.minimumAccountHistoryDays * DAY_SECONDS;
  const pageCanProveAge = successfulTimes.some((blockTime) => blockTime <= oldCutoff);
  const possibleMonths = new Set(params.evidence.activeMonths);
  successfulTimes.forEach((blockTime) => possibleMonths.add(utcMonth(blockTime)));
  const pageCanProveMonths =
    possibleMonths.size >= eligibilityRules.minimumDistinctCalendarMonths;
  const needsAge =
    params.evidence.oldestBlockTime === null ||
    params.nowSeconds - params.evidence.oldestBlockTime <
      eligibilityRules.minimumAccountHistoryDays * DAY_SECONDS;
  const needsMonths =
    params.evidence.activeMonths.size <
    eligibilityRules.minimumDistinctCalendarMonths;

  return (needsAge && !pageCanProveAge) || (needsMonths && !pageCanProveMonths);
}

function prioritySignatures(
  signatures: EligibilitySignature[],
  nowSeconds: number
): EligibilitySignature[] {
  const successful = signatures.filter(
    (item) => item.err === null && item.blockTime !== null
  );
  const selected = new Map<string, EligibilitySignature>();
  const add = (item: EligibilitySignature | undefined) => {
    if (item) selected.set(item.signature, item);
  };

  successful.slice(0, 40).forEach(add);

  const oldCutoff =
    nowSeconds - eligibilityRules.minimumAccountHistoryDays * DAY_SECONDS;
  successful
    .filter((item) => (item.blockTime ?? Number.POSITIVE_INFINITY) <= oldCutoff)
    .slice(0, 20)
    .forEach(add);

  const seenDays = new Set<string>();
  const seenMonths = new Set<string>();
  for (const item of successful) {
    const blockTime = item.blockTime!;
    const day = utcDay(blockTime);
    const month = utcMonth(blockTime);
    if (seenDays.size < 10 && !seenDays.has(day)) {
      seenDays.add(day);
      add(item);
    }
    if (seenMonths.size < 6 && !seenMonths.has(month)) {
      seenMonths.add(month);
      add(item);
    }
    if (seenDays.size >= 10 && seenMonths.size >= 6) break;
  }

  successful.slice(-10).forEach(add);
  successful.forEach(add);
  return [...selected.values()];
}

function buildMetrics(params: {
  evidence: MutableEvidence;
  nowSeconds: number;
  signaturesScanned: number;
  transactionsFetched: number;
  signaturePages: number;
}): EligibilityMetrics {
  const accountHistoryDays =
    params.evidence.oldestBlockTime === null
      ? null
      : Math.max(
          0,
          Math.floor((params.nowSeconds - params.evidence.oldestBlockTime) / DAY_SECONDS)
        );
  const daysSinceRecentActivity =
    params.evidence.newestBlockTime === null
      ? null
      : Math.max(
          0,
          Math.floor((params.nowSeconds - params.evidence.newestBlockTime) / DAY_SECONDS)
        );

  return {
    validTransactionCount: params.evidence.validSignatures.size,
    distinctActiveDays: params.evidence.activeDays.size,
    distinctActiveMonths: params.evidence.activeMonths.size,
    accountHistoryDays,
    daysSinceRecentActivity,
    signaturesScanned: params.signaturesScanned,
    transactionsFetched: params.transactionsFetched,
    estimatedRpcCredits: params.signaturePages + params.transactionsFetched,
  };
}

function failedRuleCodes(metrics: EligibilityMetrics): EligibilityReasonCode[] {
  const reasons: EligibilityReasonCode[] = [];
  if (
    metrics.accountHistoryDays === null ||
    metrics.accountHistoryDays < eligibilityRules.minimumAccountHistoryDays
  ) {
    reasons.push('ACCOUNT_HISTORY_LT_90_DAYS');
  }
  if (metrics.validTransactionCount < eligibilityRules.minimumValidTransactions) {
    reasons.push('VALID_TRANSACTIONS_LT_20');
  }
  if (metrics.distinctActiveDays < eligibilityRules.minimumDistinctUtcDays) {
    reasons.push('ACTIVE_DAYS_LT_5');
  }
  if (metrics.distinctActiveMonths < eligibilityRules.minimumDistinctCalendarMonths) {
    reasons.push('ACTIVE_MONTHS_LT_3');
  }
  if (
    metrics.daysSinceRecentActivity === null ||
    metrics.daysSinceRecentActivity > eligibilityRules.recentActivityDays
  ) {
    reasons.push('NO_RECENT_ACTIVITY');
  }
  return reasons;
}

export async function evaluateWalletEligibility(params: {
  wallet: string;
  dataSource: EligibilityDataSource;
  now?: Date;
}): Promise<EligibilityEvaluation> {
  const now = params.now ?? new Date();
  const nowSeconds = Math.floor(now.getTime() / 1_000);
  const evidence: MutableEvidence = {
    validSignatures: new Set(),
    activeDays: new Set(),
    activeMonths: new Set(),
    oldestBlockTime: null,
    newestBlockTime: null,
  };
  const seenSignatures = new Set<string>();
  let before: string | undefined;
  let signaturePages = 0;
  let signaturesScanned = 0;
  let transactionsFetched = 0;
  let historyExhausted = false;
  let providerIncomplete = false;
  let budgetExceeded = false;

  try {
    while (signaturePages < ELIGIBILITY_MAX_SIGNATURE_PAGES) {
      const page = await params.dataSource.listSignatures({
        wallet: params.wallet,
        before,
        limit: ELIGIBILITY_SIGNATURE_PAGE_SIZE,
      });
      signaturePages += 1;
      if (page.length === 0) {
        historyExhausted = true;
        break;
      }

      const uniquePage = page.filter((item) => {
        if (seenSignatures.has(item.signature)) return false;
        seenSignatures.add(item.signature);
        return true;
      });
      signaturesScanned += uniquePage.length;
      const prioritized = prioritySignatures(uniquePage, nowSeconds);
      let processedOnPage = 0;
      let advanceToOlderPage = false;

      for (
        let index = 0;
        index < prioritized.length &&
        transactionsFetched < ELIGIBILITY_MAX_TRANSACTION_DETAILS;
        index += ELIGIBILITY_TRANSACTION_BATCH_SIZE
      ) {
        const remainingBudget =
          ELIGIBILITY_MAX_TRANSACTION_DETAILS - transactionsFetched;
        const batch = prioritized.slice(
          index,
          index + Math.min(ELIGIBILITY_TRANSACTION_BATCH_SIZE, remainingBudget)
        );
        const lookups = await params.dataSource.getTransactions(
          batch.map((item) => item.signature)
        );
        transactionsFetched += batch.length;
        processedOnPage += batch.length;

        const lookupBySignature = new Map(
          lookups.map((lookup) => [lookup.signature, lookup])
        );
        for (const summary of batch) {
          const lookup = lookupBySignature.get(summary.signature);
          if (!lookup?.transaction || lookup.unavailable) {
            providerIncomplete = true;
            continue;
          }
          const blockTime = validTransactionBlockTime(
            lookup.transaction,
            params.wallet
          );
          if (blockTime === 'unavailable') {
            providerIncomplete = true;
          } else if (blockTime !== null) {
            addEvidence(evidence, summary.signature, blockTime);
          }
        }

        if (evidenceMeetsRules(evidence, nowSeconds)) break;
        if (
          shouldAdvanceToOlderPage({
            evidence,
            page: uniquePage,
            nowSeconds,
          })
        ) {
          advanceToOlderPage = true;
          break;
        }
      }

      if (evidenceMeetsRules(evidence, nowSeconds)) break;
      if (!advanceToOlderPage &&
        processedOnPage < prioritized.length &&
        transactionsFetched >= ELIGIBILITY_MAX_TRANSACTION_DETAILS
      ) {
        budgetExceeded = true;
        break;
      }

      historyExhausted = page.length < ELIGIBILITY_SIGNATURE_PAGE_SIZE;
      if (historyExhausted) break;
      before = page.at(-1)?.signature;
      if (!before) {
        providerIncomplete = true;
        break;
      }
    }
  } catch {
    providerIncomplete = true;
  }

  const metrics = buildMetrics({
    evidence,
    nowSeconds,
    signaturesScanned,
    transactionsFetched,
    signaturePages,
  });
  const ruleFailures = failedRuleCodes(metrics);
  let status: EligibilityStatus;
  let reasonCodes: EligibilityReasonCode[];

  if (ruleFailures.length === 0) {
    status = 'eligible';
    reasonCodes = [];
  } else if (
    providerIncomplete ||
    budgetExceeded ||
    (!historyExhausted && signaturePages >= ELIGIBILITY_MAX_SIGNATURE_PAGES)
  ) {
    status = 'unavailable';
    reasonCodes = [
      ...(providerIncomplete ? ['RPC_UNAVAILABLE' as const] : []),
      ...(budgetExceeded ? ['EVALUATION_BUDGET_EXCEEDED' as const] : []),
      ...(!historyExhausted && signaturePages >= ELIGIBILITY_MAX_SIGNATURE_PAGES
        ? ['HISTORY_TRUNCATED' as const]
        : []),
    ];
  } else {
    status = 'ineligible';
    reasonCodes = ruleFailures;
  }

  return {
    status,
    wallet: params.wallet,
    evaluatedAt: now.toISOString(),
    rulesVersion: eligibilityRules.version,
    rulesHash: ELIGIBILITY_RULES_SHA256,
    reasonCodes,
    metrics,
  };
}
