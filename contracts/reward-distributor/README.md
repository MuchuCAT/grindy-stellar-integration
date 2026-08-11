# RewardDistributor

`RewardDistributor` settles a final allocation prepared by the Grindy scoring engine. The contract does not score activity or decide eligibility.

## Testnet Deployment

| Item | Public reference |
| --- | --- |
| Contract ID | [`CB4BMKLN...ZAXT37M`](https://stellar.expert/explorer/testnet/contract/CB4BMKLNTZXUIIAAXULVNDZNYATKEVKHS7XJRABIS654B3LIVZAXT37M) |
| WASM upload | [`876bf9ee...2611c`](https://stellar.expert/explorer/testnet/tx/876bf9ee54681060a1b7d216978edf89306a6f79defb62c46c007be50562611c) |
| Deployment | [`31b749ea...30c01`](https://stellar.expert/explorer/testnet/tx/31b749eac8d518c687742ac6defbe2f372bd20e2c463567f77ed6c3b23c30c01) |
| Initialization | [`fe38f5cd...a9aeb`](https://stellar.expert/explorer/testnet/tx/fe38f5cd3be5785d8ba23babff48ad807d5d02aa44b7cff5701b7e46188a9aeb) |
| Allocation commitment | [`a827bfa7...9cd83`](https://stellar.expert/explorer/testnet/tx/a827bfa7431f1b3fcb7d4c88ebcbec86cfcee636e5ad9c924f5e21e97b39cd83) |
| Verified batch payout | [`b175e9ec...9ca7e`](https://stellar.expert/explorer/testnet/tx/b175e9ec332a9f02538411c2d6022a77aa27da7db4276451047511c418c9ca7e) |

Campaign #001 committed one allocation for 70 XLM and paid the public activity wallet through the authenticated batch path.

### Participant Self-Claim Proof

| Item | Public reference |
| --- | --- |
| Isolated contract | [`CDARFIGM...GVBBUPE`](https://stellar.expert/explorer/testnet/contract/CDARFIGMVZSLG6SXBSDTFKEVKANSF7567PIRIFUVGKDYA2KTIGVBBUPE) |
| Deployment | [`6be8565d...0338a`](https://stellar.expert/explorer/testnet/tx/6be8565d5e95f70e4612b9bc8f78a3bdeb7d9c76f81cab36ee4619f14280338a) |
| Initialization | [`f51fa2e3...4b43`](https://stellar.expert/explorer/testnet/tx/f51fa2e393279df53a26428580bb0279bdce084820a156528da7e04809e24b43) |
| Funding | [`83544af4...a66e`](https://stellar.expert/explorer/testnet/tx/83544af4a02fc786b72b18b9915375f90c7b29d044f8664d69094870560da66e) |
| Allocation commitment | [`186fd4f5...8ded2`](https://stellar.expert/explorer/testnet/tx/186fd4f50c862ebfabe9135e1c4d36cf7174c9f15049c34f748caef2e278ded2) |
| Participant-signed claim | [`2eafa956...99b2`](https://stellar.expert/explorer/testnet/tx/2eafa9566d2863bd8124c6b2be6dd96a48a0f747473e4cb49e408d9cb0b399b2) |

The claimant wallet authorized `claim()` directly and received 10 XLM. This isolated deployment proves the self-service lane without changing Campaign #001's independently auditable batch settlement.

## Allocation Model

1. Grindy freezes the final leaderboard.
2. The public settlement manifest is converted into deterministic leaves.
3. A leaf is the Soroban XDR encoding of `campaign_id`, `wallet`, and integer reward amount, hashed with SHA-256.
4. The allocation root, total, and participant count are committed once.
5. Participants claim with directional Merkle proofs, or the admin submits a verified batch.
6. Each wallet can be paid once.
7. Funds remaining after the claim deadline can return to the protocol owner.

## Contract API

| Function | Authorization | Purpose |
| --- | --- | --- |
| `initialize` | Admin | Stores campaign, reward asset, roles, and claim deadline. |
| `commit_allocation` | Admin | Commits the final root, total, and participant count once. |
| `claim` | Participant wallet | Verifies proof and transfers the allocated reward. |
| `batch_distribute` | Admin | Verifies and distributes multiple claims. |
| `refund_undistributed` | Protocol owner or admin | Returns remaining funds after the deadline. |
| `has_claimed` | Public | Reports whether a wallet has been paid. |
| `distributed_amount` | Public | Reads total distributed rewards. |
| `reward_balance` | Public | Reads remaining contract balance. |
| `distribution` | Public | Reads complete distribution state. |

## Events

- `DistributorInitialized`
- `AllocationCommitted`
- `RewardClaimed`
- `BatchDistributed`
- `CampaignRefunded`

## Validation

```bash
pnpm contract:test:distributor
pnpm contract:build:distributor
```

The suite covers invalid proofs, duplicate claims, ineligible allocations, insufficient balance, finalization ordering, single and multiple recipients, zero participants, and refund behavior.

This is public testnet software and has not received an external security audit.
