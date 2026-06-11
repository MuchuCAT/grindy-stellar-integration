# Grindy Stellar Integration

Open-source Stellar wallet, Soroban, and testnet integration modules for Grindy.

Grindy is already live as B2B campaign infrastructure for crypto and DeFi protocols. The production application handles campaigns, profiles, leaderboards, scoring, analytics, CEX read-only tracking and reward operations. This public repository exposes the reusable Stellar modules and testnet proof components that can be tested independently from the production application.

**Technical architecture**: [`docs/technical-architecture.md`](docs/technical-architecture.md)

**Live integration demo**: [reward-vault-next.vercel.app](https://reward-vault-next.vercel.app)

**Contract on testnet**: [`CAIBPSOZD572Z6F7M36W3PWGXP2BNGTAXGPKZFU5DZ3QAQIRQ3MXGFIS`](https://stellar.expert/explorer/testnet/contract/CAIBPSOZD572Z6F7M36W3PWGXP2BNGTAXGPKZFU5DZ3QAQIRQ3MXGFIS)

## What This Is

A public implementation of Grindy's first Stellar-native integration layer:

- Stellar wallet connection and ownership proof signing.
- Backend-safe Stellar signature verification.
- Wallet-to-profile linking primitives for the production Grindy app.
- Soroban `CampaignRewardVault` testnet contract with authenticated `deposit` and `withdraw`.
- Next.js Freighter demo that builds, signs, submits, and verifies a vault transaction.

The public repository is intentionally focused. It does not expose the private Grindy production codebase, campaign database, scoring internals, exchange API integrations, admin tooling, or deployment configuration.

## Key Features

- **Wallet Ownership Proof** — A user connects a Stellar wallet, signs a deterministic ownership message and receives a verifiable proof that can be persisted by the production profile system.
- **Freighter and Wallets Kit Support** — The wallet package includes Freighter-first flows and Stellar Wallets Kit-compatible helpers.
- **Backend Signature Verification** — The verifier package validates Stellar Ed25519 signatures without needing frontend wallet state.
- **Duplicate-Link Ready** — The ownership payload includes stable profile and wallet identifiers so the production backend can prevent one wallet from being linked to multiple profiles.
- **Soroban Reward Vault** — A testnet contract demonstrates protocol-funded reward custody with authenticated deposits, withdrawals, persistent accounting, and typed events.
- **Executable Testnet UI** — The Next.js vault demo connects Freighter, prepares a Soroban transaction, requests a signature, submits to Stellar RPC, and returns a public transaction hash.
- **Architecture Source of Truth** — The technical architecture presents the current product, the Stellar-native target architecture, campaign data flow, settlement design, security model, and SCF Build scope.

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                   Public Stellar Repository                  │
│                                                             │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │ stellar-wallet-link  │  │ stellar-signature-verifier  │  │
│  │ connect + sign proof │  │ backend Ed25519 validation  │  │
│  └──────────┬───────────┘  └──────────────┬──────────────┘  │
│             │                             │                 │
│  ┌──────────▼───────────┐                 │                 │
│  │ Wallet ownership UI  │                 │                 │
│  │ Vite + React demo    │                 │                 │
│  └──────────────────────┘                 │                 │
│                                           │                 │
│  ┌──────────────────────┐  ┌──────────────▼──────────────┐  │
│  │ reward-vault-next    │  │ CampaignRewardVault          │  │
│  │ Freighter transaction│──│ Soroban Rust contract        │  │
│  │ demo                 │  │ deposit / withdraw / events  │  │
│  └──────────┬───────────┘  └──────────────┬──────────────┘  │
└─────────────┼─────────────────────────────┼─────────────────┘
              │ Stellar RPC                 │ Stellar testnet
              ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Stellar Network                           │
│  Freighter signatures → Soroban invocation → public tx hash  │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                Production Grindy Integration                 │
│  Profile wallet link → campaign rules → event adapters       │
│  → scoring → leaderboard → reward allocation → settlement    │
└─────────────────────────────────────────────────────────────┘
```

For the product architecture, C4 system context, campaign data flow, and Stellar settlement model, see [`docs/technical-architecture.md`](docs/technical-architecture.md).

## Project Structure

```text
grindy-stellar-integration/
├── packages/
│   ├── stellar-wallet-link
│   │   └── src/index.ts               # wallet connect, ownership message, signing helpers
│   └── stellar-signature-verifier
│       ├── src/index.ts               # backend-safe signature verification
│       └── test/verifier.test.ts      # verifier unit tests
├── examples/
│   ├── grindy-stellar-wallet-demo     # Vite demo for connect + sign + verify
│   └── reward-vault-next              # Next.js demo for Freighter + vault transaction
├── contracts/
│   └── campaign-reward-vault
│       ├── src/lib.rs                 # Soroban contract
│       └── README.md                  # deployment and testnet evidence
└── docs/
    ├── technical-architecture.md      # product architecture and Stellar-native target design
    ├── ownership-message.md           # ownership proof format
    ├── security.md                    # wallet and custody boundaries
    └── setup.md                       # local setup notes
```

## Smart Contract API

| Function | Auth | Description |
| --- | --- | --- |
| `init(admin)` | `admin.require_auth()` | One-time initialization of the vault administrator and total balance. |
| `deposit(token, from, amount)` | `from.require_auth()` | Transfers tokens from the wallet into the vault and updates wallet/total accounting. |
| `withdraw(token, to, amount)` | `to.require_auth()` | Transfers previously deposited tokens from the vault back to the wallet. |
| `balance(user)` | None | Reads the stored vault balance for a wallet. |
| `total_deposited()` | None | Reads the total vault balance. |
| `admin()` | None | Reads the configured admin address. |

The current contract is a focused testnet primitive, not a full production escrow. The production settlement architecture adds campaign finalization, allocation proofs, pause/refund controls, duplicate payout prevention and mainnet security review.

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
| Transaction UI | `examples/reward-vault-next` |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- Rust with the `wasm32v1-none` target
- Stellar CLI
- A Stellar wallet extension such as Freighter

### Install and validate

```bash
pnpm install
pnpm check-types
pnpm test
pnpm build
```

### Build and test the contract

```bash
pnpm contract:test
pnpm contract:build
```

### Run the wallet ownership demo

```bash
pnpm demo
```

Open `http://localhost:5173`, connect a Stellar wallet, sign the ownership message and verify the signature locally.

### Run the reward vault transaction demo

```bash
pnpm vault:ui
```

Open `http://localhost:3040`, connect Freighter on testnet, enter an amount and submit a `deposit` or `withdraw` transaction against the deployed vault.

## Test Suite

| Area | Command | Current coverage |
| --- | --- | --- |
| TypeScript packages and demos | `pnpm check-types` | Wallet package, verifier package, Vite demo, Next.js demo. |
| Signature verifier | `pnpm test` | Valid signature, invalid signature, wrong-message rejection. |
| Production builds | `pnpm build` | Package builds, Vite production build, Next.js production build. |
| Soroban contract | `pnpm contract:test` | Deposit and withdraw round trip with accounting checks. |
| Soroban WASM | `pnpm contract:build` | Rebuilds the optimized testnet contract WASM. |

## Technology Stack

| Layer | Technology |
| --- | --- |
| Wallet connection | Stellar Wallets Kit, Freighter API |
| Wallet proof | Stellar Ed25519 signatures |
| Frontend demos | React, Vite, Next.js |
| Backend verifier package | TypeScript, `@stellar/stellar-sdk` |
| Smart contract | Rust, Soroban SDK |
| Network | Stellar testnet, Stellar RPC |
| Package manager | pnpm workspace |

## Production Extension Mapping

| Production Grindy capability | Public Stellar module | Integration path |
| --- | --- | --- |
| User profile | `stellar-wallet-link` + `stellar-signature-verifier` | Add verified Stellar public key to the existing profile model. |
| Campaign enrollment | Planned production integration | Require a verified Stellar wallet before joining Stellar-native campaigns. |
| CEX read-only tracking | Future Stellar adapters | Replace exchange trade reads with Horizon / Stellar RPC / Soroban event ingestion. |
| Campaign scoring | Future normalized event stream | Convert swaps, LP deposits, lending supply, and yield allocations into scoring inputs. |
| Leaderboards | Production integration point | Reuse existing leaderboard engine with Stellar campaign scores. |
| Reward operations | `CampaignRewardVault` pattern | Extend vault proof into campaign escrow, finalization, and distribution contracts. |

## Repository Boundary

This repository intentionally excludes:

- campaign dashboard and management logic
- CEX read-only API tracking
- DEX beta campaign logic
- scoring and reward engine internals
- database production schema/functions
- admin tooling
- API keys and deployment configuration

Only public testnet IDs and client-safe example variables are committed.

## Documentation

- [Technical Architecture](docs/technical-architecture.md) — C4-style diagrams, data flows, contract spec, database additions, API/server changes, and integration points.
- [Ownership Message](docs/ownership-message.md) — Wallet ownership payload and replay-safety notes.
- [Security](docs/security.md) — Custody boundaries, signature checks, and backend verification rules.
- [Setup](docs/setup.md) — Local setup and command reference.
- [Contract README](contracts/campaign-reward-vault/README.md) — Contract commands, deployment checklist, and testnet evidence.

## License

MIT.
