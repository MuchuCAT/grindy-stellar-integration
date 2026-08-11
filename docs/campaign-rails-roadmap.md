# Campaign Rails Delivery Roadmap

This roadmap separates the public readiness proof from the production expansion of Grindy's Stellar-native campaign infrastructure.

## Readiness Proof

| Workstream | Public result | Status |
| --- | --- | --- |
| CampaignEscrow | Campaign lifecycle, protocol-funded pool, pause, finalize, settle, and refund | Deployed and exercised on testnet |
| RewardDistributor | Allocation commitment, Merkle claims, verified batch, and unclaimed-fund refund | Deployed and exercised on testnet |
| Campaign event schema | Versioned normalized event and idempotency rules | Implemented and tested |
| Adapter SDK | Stable interface between Stellar protocol data and campaign scoring input | Implemented and tested |
| Soroswap adapter | Public Soroswap swap converted from XDR into an eligible normalized event | Implemented and fixture-tested |
| Campaign #001 | Public activity through normalization, leaderboard, allocation, settlement, and payout | Settled on testnet |
| Public evidence | Contract IDs, transaction links, fixtures, tests, and campaign page | Published in the repository and demo |

## Production Expansion

- Production wallet-to-profile persistence, backend nonces, replay protection, and campaign eligibility.
- Durable Horizon and Stellar RPC indexing with cursors, retries, ordering, idempotency, and monitoring.
- Production protocol adapters, beginning with the protocol validated by Campaign #001.
- Campaign rule configuration for protocol, pool, asset, action, duration, score, and settlement mode.
- Claimable Balance settlement for simple campaigns and hardened Soroban settlement for advanced modes.
- Additional adapters and reusable campaign templates after the first production flow is stable.

## Scope Boundary

The readiness proof validates architecture and execution without pre-building the entire production roadmap. Mainnet operations, additional ecosystem adapters, advanced anti-abuse systems, and production monitoring remain later hardening work.
