# Campaign Reward Vault

`CampaignRewardVault` is a small Soroban testnet contract that demonstrates the first on-chain settlement primitive for Grindy's Stellar integration.

The production Grindy engine already handles campaigns, scoring, leaderboards, and reward flows. This contract is not the full production escrow. It is a focused SCF proof that a protocol-funded reward pool can be represented on Stellar with authenticated wallet actions and auditable contract events.

## Contract Functions

| Function | Purpose |
| --- | --- |
| `init(admin)` | Initializes the vault administrator. |
| `deposit(token, from, amount)` | Transfers Stellar Asset Contract tokens from a signed wallet into the vault. |
| `withdraw(token, to, amount)` | Transfers previously deposited tokens back to the signed wallet. |
| `balance(user)` | Reads a user's vault balance. |
| `total_deposited()` | Reads the vault total. |
| `admin()` | Reads the configured vault admin. |

## Why This Fits Grindy

Grindy's Stellar roadmap includes protocol-funded campaign reward pools, winner settlement, and later automated reward distribution. This vault proves the smallest safe building block:

- user wallet authorization through Freighter or Stellar Wallets Kit
- token transfer into a Soroban contract
- token withdrawal from a Soroban contract
- persistent campaign-style accounting
- contract events for indexing and reviewer verification

## Local Test

```bash
cargo test --manifest-path contracts/campaign-reward-vault/Cargo.toml
```

## Build

```bash
stellar contract build --manifest-path contracts/campaign-reward-vault/Cargo.toml
```

## Current Testnet Deployment

| Item | Value |
| --- | --- |
| Network | Stellar testnet |
| Contract ID | `CAIBPSOZD572Z6F7M36W3PWGXP2BNGTAXGPKZFU5DZ3QAQIRQ3MXGFIS` |
| Native token SAC | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Admin public key | `GCDWZOFPTZQX7P4GEFK2XRDJVKOFMFFUJK4SOS37IRSKYG5WVTUIRZIT` |
| WASM hash | `8ef2c8f83fa0852593a9228e374b4113ae586b19f3da9a52eba52dcc29b5bc2d` |

Evidence:

- Upload transaction: https://stellar.expert/explorer/testnet/tx/b98d43723ea7978a3aac84f38463c6dc4ad929244fc9158088786357c0dd0c2a
- Deploy transaction: https://stellar.expert/explorer/testnet/tx/2a4e53c86cc612df553c7b1fc21b6b4d8a0860c822ba3736c12b752a9fe386a6
- Init transaction: https://stellar.expert/explorer/testnet/tx/43dd8010fb0558433da0e0d5e5ecf952e0d824cac5872d9347321fbd393c68dd
- Deposit transaction: https://stellar.expert/explorer/testnet/tx/11294adf236564f4ef164b3b1e1778b6ce831809aa8e2a1259623ad29fdfd79c
- Withdraw transaction: https://stellar.expert/explorer/testnet/tx/b096ff71470b13fc3a5c7407dfcc8d6221664766fdd57361ce2e40224529acd5

## Testnet Deployment Checklist

```bash
stellar keys generate grindy-scf-demo --network testnet --fund

stellar contract build --manifest-path contracts/campaign-reward-vault/Cargo.toml

stellar contract deploy \
  --wasm contracts/campaign-reward-vault/target/wasm32v1-none/release/campaign_reward_vault.wasm \
  --source-account grindy-scf-demo \
  --network testnet

stellar contract invoke \
  --id <DEPLOYED_CONTRACT_ID> \
  --source-account grindy-scf-demo \
  --network testnet \
  -- init \
  --admin <GRINDY_TESTNET_PUBLIC_KEY>
```

After deployment, update:

- `NEXT_PUBLIC_REWARD_VAULT_CONTRACT_ID`
- `NEXT_PUBLIC_DEMO_TOKEN_CONTRACT_ID`
- the deployment evidence table in the root `README.md`

## Security Notes

This is a testnet demonstration contract, not an audited production escrow. The production escrow will add protocol roles, campaign finalization, allocation proofs, pausing, refund paths, duplicate payout prevention, and external audit before mainnet use.
