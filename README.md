# Grindy Stellar Integration

Open-source Stellar wallet, Soroban, and testnet demo modules for Grindy's Stellar Community Fund Integration Track work.

Grindy is already live as a B2B campaign infrastructure for crypto and DeFi protocols. The production app handles campaigns, profiles, leaderboards, scoring, analytics, CEX read-only tracking, and reward operations. This public repository contains the reusable Stellar integration layer being prepared for the SCF submission.

## Scope

Deliverable 1: Stellar Wallet Connection & Wallet-to-Profile Linking

- Connect a Stellar wallet from a browser app.
- Support Stellar Wallets Kit and Freighter-first flows.
- Ask the user to sign a deterministic ownership message.
- Verify the signature server-side.
- Link the Stellar public key to an existing Grindy profile in the production Grindy app.
- Prevent duplicate wallet linking in the production persistence layer.

Additional SCF reviewer proof:

- Soroban `CampaignRewardVault` contract with `deposit` and `withdraw`.
- Next.js testnet UI that connects Freighter and submits a vault transaction.
- Deployment checklist for testnet contract evidence and demo video recording.

## Packages

```text
packages/
├── stellar-wallet-link          Browser wallet connector and ownership-message builder
└── stellar-signature-verifier   Backend-safe signature verification helpers

examples/
├── grindy-stellar-wallet-demo   Wallet ownership demo UI
└── reward-vault-next            Next.js Freighter + Soroban transaction demo

contracts/
└── campaign-reward-vault        Soroban testnet reward vault proof
```

## Repository Boundary

This repository is a public integration proof, not the full production Grindy application. It intentionally excludes:

- campaign dashboard and management logic
- CEX read-only API tracking
- DEX beta campaign logic
- scoring and reward engine internals
- database production schema/functions
- admin tooling
- API keys and deployment configuration

## Quick start

```bash
pnpm install
pnpm check-types
pnpm test
pnpm demo
```

Run the Soroban transaction demo:

```bash
pnpm vault:ui
```

Build and test the contract:

```bash
pnpm contract:build
pnpm contract:test
```

## Testnet Evidence

| Item | Status |
| --- | --- |
| Contract | `CampaignRewardVault` |
| Network | Stellar testnet |
| Contract ID | `CAIBPSOZD572Z6F7M36W3PWGXP2BNGTAXGPKZFU5DZ3QAQIRQ3MXGFIS` |
| Demo token contract | Native XLM SAC: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Admin testnet address | `GCDWZOFPTZQX7P4GEFK2XRDJVKOFMFFUJK4SOS37IRSKYG5WVTUIRZIT` |
| WASM hash | `8ef2c8f83fa0852593a9228e374b4113ae586b19f3da9a52eba52dcc29b5bc2d` |
| Deploy transactions | [upload](https://stellar.expert/explorer/testnet/tx/b98d43723ea7978a3aac84f38463c6dc4ad929244fc9158088786357c0dd0c2a), [deploy](https://stellar.expert/explorer/testnet/tx/2a4e53c86cc612df553c7b1fc21b6b4d8a0860c822ba3736c12b752a9fe386a6) |
| Init transaction | [43dd8010fb0558433da0e0d5e5ecf952e0d824cac5872d9347321fbd393c68dd](https://stellar.expert/explorer/testnet/tx/43dd8010fb0558433da0e0d5e5ecf952e0d824cac5872d9347321fbd393c68dd) |
| Deposit transaction | [11294adf236564f4ef164b3b1e1778b6ce831809aa8e2a1259623ad29fdfd79c](https://stellar.expert/explorer/testnet/tx/11294adf236564f4ef164b3b1e1778b6ce831809aa8e2a1259623ad29fdfd79c) |
| Withdraw transaction | [b096ff71470b13fc3a5c7407dfcc8d6221664766fdd57361ce2e40224529acd5](https://stellar.expert/explorer/testnet/tx/b096ff71470b13fc3a5c7407dfcc8d6221664766fdd57361ce2e40224529acd5) |
| UI | `examples/reward-vault-next` |

The deployment checklist lives in [`contracts/campaign-reward-vault/README.md`](contracts/campaign-reward-vault/README.md).

The submission demo roadmap and short video plan live in [`docs/scf-demo-roadmap.md`](docs/scf-demo-roadmap.md).

## Integration model

```text
User clicks "Connect Stellar Wallet"
      ↓
Stellar Wallets Kit / Freighter returns public key
      ↓
App builds ownership message with domain, user id, nonce, and timestamp
      ↓
Wallet signs message
      ↓
Backend verifies signature
      ↓
Production Grindy backend stores wallet link if address is not already linked
```

## Soroban Vault Model

```text
Protocol-funded reward pool
      ↓
CampaignRewardVault.deposit(token, wallet, amount)
      ↓
Soroban contract stores wallet balance and emits deposit event
      ↓
CampaignRewardVault.withdraw(token, wallet, amount)
      ↓
Wallet signs the withdrawal and receives testnet funds back
```

This testnet vault is the first public building block toward Grindy's future Stellar reward escrow and distribution layer. Production reward settlement will add campaign finalization, allocation proofs, pause/refund controls, duplicate payout prevention, and audit before mainnet use.

## License

MIT.
