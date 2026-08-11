# Security Model

## Custody Boundary

Grindy never asks for a seed phrase and never takes custody of participant trading funds, liquidity positions, or lending positions. Wallet ownership uses a human-readable signature that cannot authorize a token transfer.

Only protocol-funded campaign rewards enter `CampaignEscrow` or `RewardDistributor`. Those balances are isolated from participant DeFi activity.

## Wallet Identity

- Every ownership challenge contains the Grindy domain, profile identifier, Stellar public key, nonce, issue time, expiry, and an explicit non-transaction statement.
- The backend verifies the Ed25519 signature, rejects reused or expired nonces, and records successful consumption.
- A normalized Stellar public key can be linked to one profile only.
- Signatures, session tokens, private keys, seed phrases, API keys, and deployment credentials are never written to application logs.

## CampaignEscrow Roles

- `admin` initializes campaigns, finalizes allocations, and settles finalized campaigns.
- `protocol_owner` or `admin` can activate, pause, resume, and refund according to lifecycle rules.
- Funding requires the funder's Stellar authorization and an actual token transfer.
- Finalization is accepted once, after campaign expiry, with a non-zero participant count and an allocation that does not exceed the pool.
- Settlement atomically routes the committed allocation to the distributor and returns unused rewards to the protocol owner.
- Refund is only available from the paused state.

The current contracts use one configured admin address. Production deployments separate operational signers, document rotation procedures, and place privileged actions behind an appropriate multisignature policy.

## RewardDistributor Integrity

- Allocation root, total, and participant count are committed once.
- Claims use directional Merkle proofs over Soroban XDR allocation leaves.
- A persistent per-wallet flag rejects duplicate claims.
- Total distributed rewards cannot exceed the committed allocation or available contract balance.
- Self-claims require participant authorization; batch distribution requires admin authorization.
- Remaining funds can return to the protocol owner only after the claim deadline.

## Event Integrity

- Source transaction hash, ledger, event index, protocol, and action generate deterministic event and idempotency keys.
- Decimal amounts remain strings until converted with explicit asset precision.
- Adapter eligibility and scoring policy are separate: adapters validate protocol activity, while Grindy campaign rules calculate contribution.
- Public fixtures preserve source transaction references so normalized events can be reproduced.

## Operational Controls

- Contract state changes and reward transfers emit typed Soroban events.
- Campaign finalization stores the allocation hash, amount, and participant count.
- Deployment IDs and transaction hashes are published as testnet evidence.
- GitHub Actions reruns TypeScript tests, Soroban tests, and WASM builds.

The deployed contracts are testnet readiness software. They have not received an external security audit and must not be treated as audited mainnet contracts.
