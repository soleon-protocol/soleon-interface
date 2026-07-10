import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import {
  fetchStakePositionRecords,
  fetchWalletSnapshot,
  type StakePositionAccount,
  type StakePositionRecord,
} from '@/lib/solana/client';
import { SOLEON_CONFIG } from '@/lib/solana/config';

export const dynamic = 'force-dynamic';

type SerializedStakePositionAccount = {
  owner: string;
  positionId: string;
  amount: string;
  lockStartTime: string;
  lockEndTime: string;
  rewardPerTokenCheckpointQ64: string;
  claimedRewards: string;
  compoundedRewards: string;
  redistributedRewards: string;
  renewCount: number;
  rewardRedistributionBps: number;
  isClosed: boolean;
  bump: number;
};

function serializeStakePositionAccount(position: StakePositionAccount): SerializedStakePositionAccount {
  return {
    owner: position.owner.toBase58(),
    positionId: position.positionId.toString(),
    amount: position.amount.toString(),
    lockStartTime: position.lockStartTime.toString(),
    lockEndTime: position.lockEndTime.toString(),
    rewardPerTokenCheckpointQ64: position.rewardPerTokenCheckpointQ64.toString(),
    claimedRewards: position.claimedRewards.toString(),
    compoundedRewards: position.compoundedRewards.toString(),
    redistributedRewards: position.redistributedRewards.toString(),
    renewCount: position.renewCount,
    rewardRedistributionBps: position.rewardRedistributionBps,
    isClosed: position.isClosed,
    bump: position.bump,
  };
}

export async function GET(request: NextRequest) {
  const ownerParam = request.nextUrl.searchParams.get('owner');
  if (!ownerParam) {
    return NextResponse.json({ error: 'Missing owner' }, { status: 400 });
  }
  if (!SOLEON_CONFIG.soleonMint) {
    return NextResponse.json({ error: 'Missing Soleon mint' }, { status: 400 });
  }

  try {
    const owner = new PublicKey(ownerParam);
    const mint = new PublicKey(SOLEON_CONFIG.soleonMint);
    let positionRecords: StakePositionRecord[] = [];
    try {
      positionRecords = await fetchStakePositionRecords(owner);
    } catch (error) {
      console.error('[wallet-snapshot] Position discovery failed:', error);
    }

    const snapshot = await fetchWalletSnapshot(owner, mint, positionRecords);

    return NextResponse.json({
      owner: owner.toBase58(),
      solBalance: snapshot.solBalance.toString(),
      seonBalance: snapshot.seonBalance.toString(),
      positions: snapshot.positions.map((position) => ({
        pubkey: position.pubkey.toBase58(),
        account: serializeStakePositionAccount(position.account),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load wallet snapshot' },
      { status: 500 },
    );
  }
}
