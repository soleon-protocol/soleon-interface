import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  ELIGIBILITY_MAX_TRANSACTION_DETAILS,
  ELIGIBILITY_RULES_SHA256,
  evaluateWalletEligibility,
  type EligibilityDataSource,
  type EligibilitySignature,
  type EligibilityTransaction,
} from '../lib/genesis/eligibility';

const WALLET = '11111111111111111111111111111111';
const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const NOW = new Date('2026-07-01T12:00:00.000Z');
const DAY_SECONDS = 86_400;

function blockTimeDaysAgo(days: number, offsetSeconds = 0): number {
  return Math.floor(NOW.getTime() / 1_000) - days * DAY_SECONDS - offsetSeconds;
}

function transaction(params: {
  blockTime: number;
  signer?: boolean;
  failed?: boolean;
  programId?: string;
}): EligibilityTransaction {
  return {
    blockTime: params.blockTime,
    meta: { err: params.failed ? { InstructionError: [0, 'failure'] } : null },
    transaction: {
      message: {
        accountKeys: [
          { pubkey: WALLET, signer: params.signer ?? true },
          { pubkey: params.programId ?? SYSTEM_PROGRAM, signer: false },
        ],
        instructions: [{ programId: params.programId ?? SYSTEM_PROGRAM }],
      },
    },
  };
}

function eligibleTimes(overrides?: {
  oldestDays?: number;
  transactionCount?: number;
  activeDays?: number;
  months?: number;
  newestDays?: number;
}): number[] {
  const count = overrides?.transactionCount ?? 20;
  const activeDays = overrides?.activeDays ?? 5;
  const months = overrides?.months ?? 3;
  const oldestDays = overrides?.oldestDays ?? 90;
  const newestDays = overrides?.newestDays ?? 30;
  const monthAnchors =
    months === 2
      ? [oldestDays, newestDays]
      : [oldestDays, 60, newestDays];
  const anchors = [...new Set(monthAnchors)];
  const dayDirection = newestDays > 30 ? 1 : -1;
  let nextDay = newestDays + dayDirection;
  while (anchors.length < activeDays) {
    if (!anchors.includes(nextDay)) anchors.push(nextDay);
    nextDay += dayDirection;
  }
  const result: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const days = anchors[index % anchors.length];
    result.push(blockTimeDaysAgo(days, index));
  }
  return result;
}

class FixtureDataSource implements EligibilityDataSource {
  constructor(
    private readonly entries: Array<{
      signature: string;
      blockTime: number;
      transaction: EligibilityTransaction | null;
      unavailable?: boolean;
    }>
  ) {}

  async listSignatures(params: {
    wallet: string;
    before?: string;
    limit: number;
  }): Promise<EligibilitySignature[]> {
    const start = params.before
      ? this.entries.findIndex((entry) => entry.signature === params.before) + 1
      : 0;
    return this.entries.slice(start, start + params.limit).map((entry) => ({
      signature: entry.signature,
      blockTime: entry.blockTime,
      err: null,
    }));
  }

  async getTransactions(signatures: string[]) {
    return signatures.map((signature) => {
      const entry = this.entries.find((candidate) => candidate.signature === signature);
      return {
        signature,
        transaction: entry?.transaction ?? null,
        unavailable: entry?.unavailable,
      };
    });
  }
}

function sourceFromTimes(
  times: number[],
  transactionFactory: (blockTime: number, index: number) => EligibilityTransaction =
    (blockTime) => transaction({ blockTime })
): FixtureDataSource {
  return new FixtureDataSource(
    [...times]
      .sort((left, right) => right - left)
      .map((blockTime, index) => ({
        signature: `signature-${index.toString().padStart(4, '0')}`,
        blockTime,
        transaction: transactionFactory(blockTime, index),
      }))
  );
}

test('rules file matches the published SHA-256', async () => {
  const rulesUrl = new URL('../lib/genesis/eligibility-rules-v1.json', import.meta.url);
  const bytes = await readFile(rulesUrl);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), ELIGIBILITY_RULES_SHA256);
});

test('accepts a wallet exactly on every minimum boundary', async () => {
  const result = await evaluateWalletEligibility({
    wallet: WALLET,
    dataSource: sourceFromTimes(eligibleTimes()),
    now: NOW,
  });
  assert.equal(result.status, 'eligible');
  assert.deepEqual(result.reasonCodes, []);
  assert.equal(result.metrics.validTransactionCount, 20);
  assert.equal(result.metrics.accountHistoryDays, 90);
});

for (const boundary of [
  {
    name: '89 days',
    times: eligibleTimes({ oldestDays: 89 }),
    reason: 'ACCOUNT_HISTORY_LT_90_DAYS',
  },
  {
    name: '19 transactions',
    times: eligibleTimes({ transactionCount: 19 }),
    reason: 'VALID_TRANSACTIONS_LT_20',
  },
  {
    name: '4 active days',
    times: eligibleTimes({ activeDays: 4 }),
    reason: 'ACTIVE_DAYS_LT_5',
  },
  {
    name: '2 active months',
    times: eligibleTimes({ months: 2 }),
    reason: 'ACTIVE_MONTHS_LT_3',
  },
  {
    name: '31 days since recent activity',
    times: eligibleTimes({ newestDays: 31 }),
    reason: 'NO_RECENT_ACTIVITY',
  },
] as const) {
  test(`rejects the ${boundary.name} boundary`, async () => {
    const result = await evaluateWalletEligibility({
      wallet: WALLET,
      dataSource: sourceFromTimes(boundary.times),
      now: NOW,
    });
    assert.equal(result.status, 'ineligible');
    assert.ok(result.reasonCodes.includes(boundary.reason));
  });
}

test('does not count failed, non-signer, memo-only or vote-only transactions', async () => {
  const invalidPrograms = [
    MEMO_PROGRAM,
    'Vote111111111111111111111111111111111111111',
  ];
  const valid = eligibleTimes({ transactionCount: 19 });
  const extra = [
    blockTimeDaysAgo(6),
    blockTimeDaysAgo(7),
    blockTimeDaysAgo(8),
    blockTimeDaysAgo(9),
  ];
  const result = await evaluateWalletEligibility({
    wallet: WALLET,
    dataSource: sourceFromTimes([...valid, ...extra], (blockTime, index) => {
      if (index === 0) return transaction({ blockTime, failed: true });
      if (index === 1) return transaction({ blockTime, signer: false });
      if (index === 2) return transaction({ blockTime, programId: invalidPrograms[0] });
      if (index === 3) return transaction({ blockTime, programId: invalidPrograms[1] });
      return transaction({ blockTime });
    }),
    now: NOW,
  });
  assert.equal(result.status, 'ineligible');
  assert.ok(result.reasonCodes.includes('VALID_TRANSACTIONS_LT_20'));
});

test('returns unavailable when transaction history cannot be read', async () => {
  const entries = eligibleTimes({ transactionCount: 19 }).map((blockTime, index) => ({
    signature: `signature-${index}`,
    blockTime,
    transaction: index === 0 ? null : transaction({ blockTime }),
    unavailable: index === 0,
  }));
  const result = await evaluateWalletEligibility({
    wallet: WALLET,
    dataSource: new FixtureDataSource(entries),
    now: NOW,
  });
  assert.equal(result.status, 'unavailable');
  assert.ok(result.reasonCodes.includes('RPC_UNAVAILABLE'));
});

test('returns unavailable instead of rejecting when the detail budget is exhausted', async () => {
  const times = Array.from(
    { length: ELIGIBILITY_MAX_TRANSACTION_DETAILS + 1 },
    (_, index) => blockTimeDaysAgo(index % 100, index)
  );
  const result = await evaluateWalletEligibility({
    wallet: WALLET,
    dataSource: sourceFromTimes(
      times,
      (blockTime) => transaction({ blockTime, signer: false })
    ),
    now: NOW,
  });
  assert.equal(result.status, 'unavailable');
  assert.ok(result.reasonCodes.includes('EVALUATION_BUDGET_EXCEEDED'));
  assert.equal(
    result.metrics.transactionsFetched,
    ELIGIBILITY_MAX_TRANSACTION_DETAILS
  );
});

test('paginates past a dense recent history without exhausting transaction details', async () => {
  const recentEntries = Array.from({ length: 1_000 }, (_, index) => {
    const blockTime = blockTimeDaysAgo(index % 10, index);
    return {
      signature: `recent-${index.toString().padStart(4, '0')}`,
      blockTime,
      transaction: transaction({ blockTime }),
    };
  });
  const oldEntries = eligibleTimes().map((blockTime, index) => ({
    signature: `old-${index.toString().padStart(4, '0')}`,
    blockTime,
    transaction: transaction({ blockTime }),
  }));
  const result = await evaluateWalletEligibility({
    wallet: WALLET,
    dataSource: new FixtureDataSource([...recentEntries, ...oldEntries]),
    now: NOW,
  });
  assert.equal(result.status, 'eligible');
  assert.ok(result.metrics.signaturesScanned > 1_000);
  assert.ok(result.metrics.transactionsFetched < ELIGIBILITY_MAX_TRANSACTION_DETAILS);
});
