# Setup

## Install

```bash
pnpm install
pnpm check-types
pnpm test
pnpm demo
```

## Reward vault demo

Run the Next.js Soroban transaction demo:

```bash
pnpm vault:ui
```

The demo defaults to the deployed Stellar testnet `CampaignRewardVault` and the native XLM Stellar Asset Contract. To override them for a new deployment:

```bash
cp examples/reward-vault-next/.env.example examples/reward-vault-next/.env.local
```

Then update:

- `NEXT_PUBLIC_REWARD_VAULT_CONTRACT_ID`
- `NEXT_PUBLIC_DEMO_TOKEN_CONTRACT_ID`

## Soroban contract

Build and test the reward vault:

```bash
pnpm contract:build
pnpm contract:test
```

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

## Production Grindy integration

In the production app, the verified wallet link should be stored against the existing user profile. Duplicate wallet linking must be enforced by a unique/indexed lookup on the Stellar public key.

Do not store private keys. Do not ask for seed phrases. Do not require custody of user funds.
