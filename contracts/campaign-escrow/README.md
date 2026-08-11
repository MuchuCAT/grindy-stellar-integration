# CampaignEscrow

`CampaignEscrow` is the protocol-funded reward pool and lifecycle contract for a Grindy campaign. It never receives participant trading funds or DeFi positions.

## Testnet Deployment

| Item | Public reference |
| --- | --- |
| Contract ID | [`CDTZ7IWF...HJABCLP`](https://stellar.expert/explorer/testnet/contract/CDTZ7IWFMOLUIPBNWF2H4MMA4JBAYVWKVQC4IISSIZNJLUYYZHJABCLP) |
| WASM upload | [`366a60d7...39104a`](https://stellar.expert/explorer/testnet/tx/366a60d715a69b156cc8c7da9939795a3115fb0436210d1fcf948a2fc839104a) |
| Deployment | [`764cb97a...6cc01d`](https://stellar.expert/explorer/testnet/tx/764cb97a9ae9813e0564df5c493d255527e868a12a83c09a9fe3255e726cc01d) |
| Initialization | [`6a6438e6...9c353f`](https://stellar.expert/explorer/testnet/tx/6a6438e6e3c5ed21bbeeaa0738a86205e0041509605054356a15de5e6e9c353f) |
| Funding, 100 XLM | [`57cc628e...623a96`](https://stellar.expert/explorer/testnet/tx/57cc628ecd0c6bed3126b06b14befe47af683efac53728c466f1e7cc93623a96) |
| Finalization | [`8cfe4125...ae2124`](https://stellar.expert/explorer/testnet/tx/8cfe41256d43cf9e6c33b876c24b574e29a9eaff0458e4a01ae6deee79ae2124) |
| Settlement | [`9eb29891...b0bcea`](https://stellar.expert/explorer/testnet/tx/9eb29891c17575abc4ac1178175b1ccf8f2d13c5fbf7c81780601efa73b0bcea) |

Campaign #001 settled 70 XLM to the distributor and atomically returned the unused 30 XLM to the protocol owner.

## Lifecycle

```text
Created -> Funded -> Active -> Finalized -> Settled
                       |
                       v
                     Paused -> Active
                       |
                       v
                    Refunded
```

## Contract API

| Function | Authorization | Purpose |
| --- | --- | --- |
| `initialize_campaign` | Admin | Creates one campaign with owner, asset, and time bounds. |
| `fund_campaign` | Funder | Transfers protocol rewards into the contract. |
| `activate_campaign` | Protocol owner or admin | Opens the funded campaign during its configured window. |
| `pause_campaign` | Protocol owner or admin | Pauses an active campaign. |
| `resume_campaign` | Protocol owner or admin | Resumes a non-expired paused campaign. |
| `finalize_campaign` | Admin | Commits allocation hash, total, and participant count after campaign end. |
| `settle_campaign` | Admin | Routes the allocation to the distributor and returns unused rewards. |
| `refund_campaign` | Protocol owner or admin | Returns a paused campaign pool to the protocol owner. |
| `campaign_status` | Public | Reads the lifecycle state. |
| `reward_balance` | Public | Reads the available reward balance. |
| `campaign` | Public | Reads complete campaign state. |

## Validation

```bash
pnpm contract:test:escrow
pnpm contract:build:escrow
```

The suite covers roles, invalid funding, repeated finalization, pause/resume, refund, pool limits, expiry, no-participant finalization, and the complete settlement path.

## Refund Proof

A separate testnet instance demonstrates `Active -> Paused -> Refunded` without altering Campaign #001:

- Contract: [`CDHF24VR...XEYRAU`](https://stellar.expert/explorer/testnet/contract/CDHF24VRHBKAJLAQKI3EK4FT2EP4OMLAER7YLYDTZKR6KTQQN6XEYRAU)
- Pause: [`3bcd30f7...d8bece`](https://stellar.expert/explorer/testnet/tx/3bcd30f7317cbc69c52d39ccb6b4635bbf268830d6b16aedd0396a5402d8bece)
- Refund: [`0a273288...87ba63`](https://stellar.expert/explorer/testnet/tx/0a273288d45b153d29acca6b05ab5d35a4d1a9eff94ca325732512780087ba63)

This is public testnet software and has not received an external security audit.
