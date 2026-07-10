import assert from 'node:assert/strict';
import { createPrivateKey, randomBytes, sign } from 'node:crypto';
import { Keypair } from '@solana/web3.js';

const baseUrl = (process.argv[2] ?? process.env.SOLEON_TEST_BASE_URL ?? 'http://localhost:3000')
  .replace(/\/$/, '');

function privateKeyFromSolanaKeypair(keypair) {
  const ed25519Pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  return createPrivateKey({
    key: Buffer.concat([ed25519Pkcs8Prefix, Buffer.from(keypair.secretKey.slice(0, 32))]),
    format: 'der',
    type: 'pkcs8',
  });
}

function signMessage(keypair, message) {
  return sign(
    null,
    Buffer.from(message, 'utf8'),
    privateKeyFromSolanaKeypair(keypair)
  ).toString('base64');
}

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  return { response, payload };
}

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const payload = await response.json();
  return { response, payload };
}

async function requestChallenge(wallet) {
  const result = await post('/api/genesis/challenge', { wallet });
  assert.equal(result.response.status, 200, JSON.stringify(result.payload));
  assert.equal(typeof result.payload.challengeId, 'string');
  assert.equal(typeof result.payload.message, 'string');
  assert.match(result.payload.message, new RegExp(`Wallet: ${wallet}`));
  return result.payload;
}

const owner = Keypair.generate();
const otherWallet = Keypair.generate();
const ownerAddress = owner.publicKey.toBase58();

const claimStatus = await get(
  `/api/genesis/eligibility?wallet=${encodeURIComponent(ownerAddress)}`
);
assert.equal(claimStatus.response.status, 200, JSON.stringify(claimStatus.payload));
assert.equal(typeof claimStatus.payload.configured, 'boolean');
assert.equal(typeof claimStatus.payload.claimsToday, 'number');
assert.equal(typeof claimStatus.payload.vaultBalance, 'string');

const invalidClaimAuthorization = await post('/api/genesis/claim-transaction', {
  wallet: ownerAddress,
  claimAuthorizationToken: randomBytes(32).toString('base64url'),
});
assert.equal(
  invalidClaimAuthorization.response.status,
  410,
  JSON.stringify(invalidClaimAuthorization.payload)
);
assert.equal(
  invalidClaimAuthorization.payload.error.code,
  'CLAIM_AUTHORIZATION_EXPIRED'
);

const challenge = await requestChallenge(ownerAddress);
const signature = signMessage(owner, challenge.message);

const mismatch = await post('/api/genesis/challenge/verify', {
  wallet: otherWallet.publicKey.toBase58(),
  challengeId: challenge.challengeId,
  signature,
});
assert.equal(mismatch.response.status, 403, JSON.stringify(mismatch.payload));

const verified = await post('/api/genesis/challenge/verify', {
  wallet: ownerAddress,
  challengeId: challenge.challengeId,
  signature,
});
assert.equal(verified.response.status, 200, JSON.stringify(verified.payload));
assert.equal(verified.payload.verified, true);
assert.equal(verified.payload.wallet, ownerAddress);
assert.equal(typeof verified.payload.verificationToken, 'string');

const eligibility = await post('/api/genesis/eligibility', {
  wallet: ownerAddress,
  verificationToken: verified.payload.verificationToken,
});
assert.equal(eligibility.response.status, 200, JSON.stringify(eligibility.payload));
assert.equal(eligibility.payload.evaluation.wallet, ownerAddress);
assert.equal(eligibility.payload.evaluation.status, 'ineligible');
assert.equal(eligibility.payload.evaluation.metrics.validTransactionCount, 0);

const eligibilityReplay = await post('/api/genesis/eligibility', {
  wallet: ownerAddress,
  verificationToken: verified.payload.verificationToken,
});
assert.equal(eligibilityReplay.response.status, 410, JSON.stringify(eligibilityReplay.payload));

const replay = await post('/api/genesis/challenge/verify', {
  wallet: ownerAddress,
  challengeId: challenge.challengeId,
  signature,
});
assert.equal(replay.response.status, 410, JSON.stringify(replay.payload));

const secondChallenge = await requestChallenge(ownerAddress);
const invalidSignature = signMessage(owner, `${secondChallenge.message}\ntampered`);
const invalid = await post('/api/genesis/challenge/verify', {
  wallet: ownerAddress,
  challengeId: secondChallenge.challengeId,
  signature: invalidSignature,
});
assert.equal(invalid.response.status, 401, JSON.stringify(invalid.payload));

const secondVerified = await post('/api/genesis/challenge/verify', {
  wallet: ownerAddress,
  challengeId: secondChallenge.challengeId,
  signature: signMessage(owner, secondChallenge.message),
});
assert.equal(secondVerified.response.status, 200, JSON.stringify(secondVerified.payload));

const cachedEligibility = await post('/api/genesis/eligibility', {
  wallet: ownerAddress,
  verificationToken: secondVerified.payload.verificationToken,
});
assert.equal(
  cachedEligibility.response.status,
  200,
  JSON.stringify(cachedEligibility.payload)
);
assert.equal(cachedEligibility.payload.cached, true);
assert.equal(cachedEligibility.payload.evaluation.status, 'ineligible');

console.log(`Genesis challenge integration passed against ${baseUrl}`);
