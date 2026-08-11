# Grindy Campaign Rails

Open-source attribution and settlement infrastructure for measurable Stellar DeFi campaigns.

[Grindy.fun](https://www.grindy.fun) is the first reference implementation. The live product already operates campaign enrollment, scoring, leaderboards, analytics, and reward operations. This repository contains the reusable Stellar components that connect verifiable wallet activity to campaign attribution and transparent settlement.

- **Live Stellar lab:** [stellar.grindy.fun](https://stellar.grindy.fun)
- **Campaign #001:** [stellar.grindy.fun/campaigns/testnet-001](https://stellar.grindy.fun/campaigns/testnet-001)
- **Technical architecture:** [docs/technical-architecture.md](docs/technical-architecture.md)
- **License:** [MIT](LICENSE)

## End-to-End Proof

Grindy Stellar Testnet Campaign #001 demonstrates the complete public readiness path:

```text
Soroswap testnet swap
        |
        v
Soroswap adapter decodes XDR
        |
        v
NormalizedCampaignEvent
        |
        v
Eligibility and contribution
        |
        v
Final leaderboard and allocation manifest
        |
        v
CampaignEscrow finalization
        |
        v
RewardDistributor commitment and payout
```

| Proof | Result |
| --- | --- |
| Source activity | [Public Soroswap transaction](https://stellar.expert/explorer/testnet/tx/48dc831a8865641b1af97d817454afa0a1e4643f7fbc7bd058988ef42d4b3318) |
| Normalized contribution | 200 XLM eligible swap volume |
| Reward pool | 100 XLM |
| Final allocation | 70 XLM to one participant |
| Unused pool | 30 XLM returned atomically to the protocol owner |
| Settlement | [Public batch payout](https://stellar.expert/explorer/testnet/tx/b175e9ec332a9f02538411c2d6022a77aa27da7db4276451047511c418c9ca7e) |
| Participant claim proof | [Participant-signed `claim()` transaction](https://stellar.expert/explorer/testnet/tx/2eafa9566d2863bd8124c6b2be6dd96a48a0f747473e4cb49e408d9cb0b399b2) |
| Final status | Settled |

The Campaign #001 activity wallet was paid through the authenticated batch path because this repository does not control that participant key. The participant path was also exercised independently on testnet: a separate wallet committed its allocation and signed `claim()` itself against an isolated RewardDistributor deployment.

## Campaign Contracts

### CampaignEscrow

Protocol-funded reward custody and campaign lifecycle:

```text
Created -> Funded -> Active -> Finalized -> Settled
                       |
                       v
                     Paused -> Active
                       |
                       v
                    Refunded
```

- Contract: [`CDTZ7IWF...HJABCLP`](https://stellar.expert/explorer/testnet/contract/CDTZ7IWFMOLUIPBNWF2H4MMA4JBAYVWKVQC4IISSIZNJLUYYZHJABCLP)
- Funding: [100 XLM transaction](https://stellar.expert/explorer/testnet/tx/57cc628ecd0c6bed3126b06b14befe47af683efac53728c466f1e7cc93623a96)
- Finalization: [allocation commitment](https://stellar.expert/explorer/testnet/tx/8cfe41256d43cf9e6c33b876c24b574e29a9eaff0458e4a01ae6deee79ae2124)
- Settlement: [70 XLM routed and 30 XLM returned](https://stellar.expert/explorer/testnet/tx/9eb29891c17575abc4ac1178175b1ccf8f2d13c5fbf7c81780601efa73b0bcea)
- Pause/refund proof: [pause](https://stellar.expert/explorer/testnet/tx/3bcd30f7317cbc69c52d39ccb6b4635bbf268830d6b16aedd0396a5402d8bece), [refund](https://stellar.expert/explorer/testnet/tx/0a273288d45b153d29acca6b05ab5d35a4d1a9eff94ca325732512780087ba63)
- Contract reference: [contracts/campaign-escrow/README.md](contracts/campaign-escrow/README.md)

### RewardDistributor

Final allocation commitment, participant claims, verified batches, and duplicate-payment prevention:

- Contract: [`CB4BMKLN...ZAXT37M`](https://stellar.expert/explorer/testnet/contract/CB4BMKLNTZXUIIAAXULVNDZNYATKEVKHS7XJRABIS654B3LIVZAXT37M)
- Allocation root: `27f185b31c6c785856541b5222efc76d4ea188a802b22b7a85a0c776709f11db`
- Commitment: [public transaction](https://stellar.expert/explorer/testnet/tx/a827bfa7431f1b3fcb7d4c88ebcbec86cfcee636e5ad9c924f5e21e97b39cd83)
- Payout: [public transaction](https://stellar.expert/explorer/testnet/tx/b175e9ec332a9f02538411c2d6022a77aa27da7db4276451047511c418c9ca7e)
- Self-claim proof contract: [`CDARFIGM...GVBBUPE`](https://stellar.expert/explorer/testnet/contract/CDARFIGMVZSLG6SXBSDTFKEVKANSF7567PIRIFUVGKDYA2KTIGVBBUPE)
- Participant-signed claim: [public transaction](https://stellar.expert/explorer/testnet/tx/2eafa9566d2863bd8124c6b2be6dd96a48a0f747473e4cb49e408d9cb0b399b2)
- Contract reference: [contracts/reward-distributor/README.md](contracts/reward-distributor/README.md)

The original [`CampaignRewardVault`](contracts/campaign-reward-vault/README.md) remains in the repository as the earlier narrow `deposit` / `withdraw` testnet primitive. Campaign #001 uses the production-shaped escrow and distributor contracts above.

## Attribution Layer

### NormalizedCampaignEvent

[`packages/campaign-event-schema`](packages/campaign-event-schema) defines the versioned public boundary between protocol-specific activity and campaign scoring.

```json
{
  "schemaVersion": "1.0",
  "campaignId": "grindy-stellar-testnet-campaign-001",
  "network": "testnet",
  "wallet": "GDY2IB6RSKMLRFLAPPCLVRHPDAFYRL6V7SZDZP4QSHP3Y3XMGVDSYDN2",
  "protocol": "soroswap",
  "action": "swap",
  "asset": "XLM",
  "amount": "200",
  "ledger": 4084752,
  "transactionHash": "48dc831a8865641b1af97d817454afa0a1e4643f7fbc7bd058988ef42d4b3318",
  "timestamp": "2026-08-11T10:39:53Z",
  "eventId": "0017543876252295168-0000000004",
  "idempotencyKey": "..."
}
```

Amounts remain decimal strings, immutable ledger records receive deterministic event IDs, and campaign-specific idempotency keys prevent duplicate scoring across retries.

### Adapter SDK and Soroswap

[`packages/adapter-sdk`](packages/adapter-sdk) defines the interface from raw Stellar activity to a normalized contribution. [`adapters/soroswap`](adapters/soroswap) is the first working implementation:

- decodes the public Soroswap Router event from Stellar XDR;
- validates contract, topics, campaign period, assets, pool, and wallet;
- preserves integer precision with decimal strings and `BigInt`;
- emits one deterministic normalized event;
- converts the eligible 200 XLM swap into a campaign scoring input.

The fixture is a real public testnet transaction, not synthetic activity. Protocol-specific scoring policy remains outside the adapter.

## Repository Structure

```text
grindy-stellar-integration/
├── contracts/
│   ├── campaign-escrow/
│   ├── reward-distributor/
│   └── campaign-reward-vault/
├── packages/
│   ├── stellar-wallet-link/
│   ├── stellar-signature-verifier/
│   ├── campaign-event-schema/
│   └── adapter-sdk/
├── adapters/
│   └── soroswap/
├── examples/
│   ├── grindy-stellar-wallet-demo/
│   └── reward-vault-next/
└── docs/
    ├── technical-architecture.md
    ├── campaign-rails-roadmap.md
    ├── event-schema.md
    ├── settlement-manifest.md
    ├── security.md
    └── setup.md
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- Rust with the `wasm32v1-none` target
- Stellar CLI for optimized contract builds
- Freighter for interactive testnet flows

### Install and validate

```bash
pnpm install
pnpm check-types
pnpm test
pnpm build
pnpm contract:test
pnpm contract:build
```

### Run the public lab

```bash
pnpm vault:ui
```

Open `http://localhost:3040` for wallet ownership and vault interaction. Campaign #001 is available at `http://localhost:3040/campaigns/testnet-001`.

## Test Coverage

| Area | Coverage |
| --- | --- |
| Wallet proof | Message construction, valid signature, invalid signature, wrong message |
| Event schema | Runtime validation, deterministic event IDs, idempotency |
| Adapter SDK | Eligibility guards and scoring-input boundary |
| Soroswap adapter | XDR decode, topic validation, precision, filtering, deterministic normalization |
| CampaignEscrow | Roles, funding, lifecycle, expiry, no participants, pool limit, settlement, refund |
| RewardDistributor | Allocation commitment, proof validation, duplicate claims, batches, balance limits, refunds |
| Public demos | TypeScript checks and production builds |

GitHub Actions reruns TypeScript builds/tests and all three Soroban contract test/WASM builds on pushes and pull requests.

## Security Boundary

- Grindy never requests or stores private keys or seed phrases.
- Wallet ownership signatures cannot move funds.
- Participant trading funds and DeFi positions never enter Grindy contracts.
- Only protocol-funded campaign rewards are escrowed.
- Campaign and distribution roles are explicit and authenticated.
- Allocation commitments are immutable after finalization.
- Claims are idempotent and duplicate payouts are rejected.
- Advanced settlement includes pause and protocol refund paths.
- Testnet contracts are public readiness software and have not received an external security audit.

See [docs/security.md](docs/security.md) for the complete public security model.

## Public and Commercial Boundary

This repository publishes reusable Stellar infrastructure:

- wallet ownership and signature modules;
- normalized campaign event schema;
- adapter interface and public protocol adapters;
- Soroban campaign settlement contracts;
- fixtures, tests, deployment evidence, and technical documentation.

The hosted Grindy product retains campaign operations, configurable scoring policy, partner analytics, anti-abuse review, administration, and private production infrastructure.

No secrets, production API keys, private deployment credentials, or private application code belong in this repository.

## Documentation

- [Technical Architecture](docs/technical-architecture.md)
- [Campaign Rails Roadmap](docs/campaign-rails-roadmap.md)
- [Campaign Event Schema](docs/event-schema.md)
- [Settlement Manifest](docs/settlement-manifest.md)
- [Soroswap Adapter](docs/adapters/soroswap.md)
- [Security Model](docs/security.md)
- [Local Setup](docs/setup.md)

## License

MIT.
