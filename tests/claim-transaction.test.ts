import assert from 'node:assert/strict';
import test from 'node:test';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  createCommitmentClaimTransaction,
  deriveCommitmentClaimReceiptPda,
  deriveCommitmentDistributionConfigPda,
  type CommitmentDistributionConfigAccount,
} from '../lib/solana/client';

function createFixture() {
  const owner = Keypair.generate();
  const eligibilityAuthority = Keypair.generate();
  const programId = Keypair.generate().publicKey;
  const distributionConfig: CommitmentDistributionConfigAccount = {
    soleonMint: Keypair.generate().publicKey,
    distributionVault: Keypair.generate().publicKey,
    authority: Keypair.generate().publicKey,
    eligibilityAuthority: eligibilityAuthority.publicKey,
    maintenanceFeeReceiver: Keypair.generate().publicKey,
    closeRecipient: Keypair.generate().publicKey,
    totalClaimed: BigInt(0),
    successfulWallets: BigInt(0),
    openClaimReceipts: BigInt(0),
    currentUtcDay: BigInt(0),
    claimsToday: 0,
    closed: false,
    configBump: 0,
    distributionVaultBump: 0,
  };
  const transaction = createCommitmentClaimTransaction({
    owner: owner.publicKey,
    eligibilityAuthority: eligibilityAuthority.publicKey,
    distributionConfig,
    programId,
  });
  transaction.feePayer = owner.publicKey;
  transaction.recentBlockhash = Keypair.generate().publicKey.toBase58();
  transaction.partialSign(eligibilityAuthority);

  return {
    owner,
    eligibilityAuthority,
    programId,
    distributionConfig,
    transaction,
  };
}

test('builds a fixed claim transaction with only the server signature present', () => {
  const fixture = createFixture();
  const transaction = Transaction.from(
    fixture.transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: true,
    })
  );
  const claimInstruction = transaction.instructions.at(-1);
  assert.ok(claimInstruction);

  const [configPda] = deriveCommitmentDistributionConfigPda(fixture.programId);
  const [receiptPda] = deriveCommitmentClaimReceiptPda(
    fixture.owner.publicKey,
    fixture.programId
  );

  assert.equal(transaction.signatures.length, 2);
  assert.equal(
    transaction.signatures.find((entry) =>
      entry.publicKey.equals(fixture.owner.publicKey)
    )?.signature,
    null
  );
  assert.ok(
    transaction.signatures.find((entry) =>
      entry.publicKey.equals(fixture.eligibilityAuthority.publicKey)
    )?.signature
  );
  assert.equal(claimInstruction.programId.toBase58(), fixture.programId.toBase58());
  assert.equal(claimInstruction.keys[0].pubkey.toBase58(), fixture.owner.publicKey.toBase58());
  assert.equal(
    claimInstruction.keys[1].pubkey.toBase58(),
    fixture.eligibilityAuthority.publicKey.toBase58()
  );
  assert.equal(claimInstruction.keys[2].pubkey.toBase58(), configPda.toBase58());
  assert.equal(claimInstruction.keys[4].pubkey.toBase58(), receiptPda.toBase58());
  assert.equal(transaction.verifySignatures(false), true);
});

test('changing any fixed claim account invalidates the server signature', () => {
  const { transaction } = createFixture();
  const claimInstruction = transaction.instructions.at(-1);
  assert.ok(claimInstruction);

  claimInstruction.keys[3].pubkey = Keypair.generate().publicKey;
  assert.equal(transaction.verifySignatures(false), false);
});

test('changing the blockhash invalidates the server signature', () => {
  const { transaction } = createFixture();
  transaction.recentBlockhash = Keypair.generate().publicKey.toBase58();
  assert.equal(transaction.verifySignatures(false), false);
});

test('changing the claim instruction data invalidates the server signature', () => {
  const { transaction } = createFixture();
  const claimInstruction = transaction.instructions.at(-1);
  assert.ok(claimInstruction);

  claimInstruction.data = Buffer.from(claimInstruction.data);
  claimInstruction.data[0] ^= 0xff;
  assert.equal(transaction.verifySignatures(false), false);
});
