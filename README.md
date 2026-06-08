# Grindy Stellar Integration

Open-source Stellar wallet connection and wallet-to-profile linking modules for Grindy's Stellar Community Fund Integration Track work.

This repository is intentionally small and reusable. It does **not** contain the private Grindy campaign engine, CEX integrations, Convex schema, admin tooling, user data, API keys, or proprietary scoring/business logic.

## Scope

Deliverable 1: Stellar Wallet Connection & Wallet-to-Profile Linking

- Connect a Stellar wallet from a browser app.
- Support Stellar Wallets Kit and Freighter-first flows.
- Ask the user to sign a deterministic ownership message.
- Verify the signature server-side.
- Link the Stellar public key to an existing Grindy profile in the private app.
- Prevent duplicate wallet linking in the private app's persistence layer.

## Packages

```text
packages/
├── stellar-wallet-link          Browser wallet connector and ownership-message builder
└── stellar-signature-verifier   Backend-safe signature verification helpers

examples/
└── grindy-stellar-wallet-demo   Stellar-only demo UI for reviewers
```

## What remains private

The production Grindy repository remains proprietary. It contains:

- campaign dashboard and management logic
- CEX read-only API tracking
- DEX beta campaign logic
- scoring and reward engine internals
- Convex production schema/functions
- admin tooling
- API keys and deployment configuration

## Quick start

```bash
pnpm install
pnpm check-types
pnpm test
pnpm demo
```

The demo intentionally shows only a Stellar wallet flow. It does not expose MetaMask, Phantom, Solflare, or private Grindy campaign functionality.

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
Private Grindy app stores wallet link if address is not already linked
```

## License

MIT.

