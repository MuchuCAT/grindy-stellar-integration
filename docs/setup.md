# Setup

## Install

```bash
pnpm install
pnpm check-types
pnpm test
pnpm demo
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

## Private Grindy integration

In the private app, the verified wallet link should be stored against the existing user profile. Duplicate wallet linking must be enforced by a unique/indexed lookup on the Stellar public key.

Do not store private keys. Do not ask for seed phrases. Do not require custody of user funds.

