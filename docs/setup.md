# Setup

## Install

```bash
pnpm install
pnpm check-types
pnpm test
pnpm build
```

## Reward vault demo

Run the Next.js Soroban transaction demo:

```bash
pnpm vault:ui
```

The lab defaults to the deployed Stellar testnet `CampaignRewardVault` and native XLM Stellar Asset Contract for the interactive deposit/withdraw view. Campaign #001 uses the separate `CampaignEscrow` and `RewardDistributor` evidence published at `/campaigns/testnet-001`.

```bash
cp examples/reward-vault-next/.env.example examples/reward-vault-next/.env.local
```

Then update:

- `NEXT_PUBLIC_REWARD_VAULT_CONTRACT_ID`
- `NEXT_PUBLIC_DEMO_TOKEN_CONTRACT_ID`

## Soroban Contracts

Build and test all contracts:

```bash
pnpm contract:build
pnpm contract:test
```

Run one contract independently:

```bash
pnpm contract:test:escrow
pnpm contract:test:distributor
pnpm contract:build:escrow
pnpm contract:build:distributor
```

## Campaign Event and Adapter Tests

```bash
pnpm --filter @grindy/campaign-event-schema test
pnpm --filter @grindy/adapter-sdk test
pnpm --filter @grindy/soroswap-adapter test
```

The Soroswap fixture uses a real public testnet event and does not require a private RPC key.

## Browser package

Use `@grindy/stellar-wallet-link` in a frontend to connect a Stellar wallet and request an ownership signature.

```ts
import {
  buildOwnershipMessage,
  connectWithStellarWalletsKit,
  signOwnershipMessageWithKit,
} from "@grindy/stellar-wallet-link";
```

## Backend verifier

Use `@grindy/stellar-signature-verifier` in the backend to verify a signed ownership message.

```ts
import { verifyStellarOwnershipSignature } from "@grindy/stellar-signature-verifier";

const ok = verifyStellarOwnershipSignature({
  publicKey,
  message,
  signature,
  signatureEncoding: "base64",
});
```

## Hosted Grindy Integration

In the production app, the verified wallet link should be stored against the existing user profile. Duplicate wallet linking must be enforced by a unique/indexed lookup on the Stellar public key.

Do not store private keys. Do not ask for seed phrases. Do not require custody of user funds.
