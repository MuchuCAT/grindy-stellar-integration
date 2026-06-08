# Security Notes

## Non-custodial by design

This module never asks for a seed phrase and never takes custody of funds. It only asks the wallet to sign a human-readable ownership message.

## Duplicate wallet prevention

The production Grindy backend must enforce that a Stellar public key can only be linked to one Grindy user profile at a time.

Recommended backend checks:

- store the normalized Stellar public key
- index the public key for fast duplicate lookup
- reject already-linked public keys
- expire ownership challenges quickly
- mark nonce values as used after successful verification

## Message scope

The signed message must clearly say it is only for wallet ownership verification and does not authorize a transaction.

## Replay protection

Every challenge must include a nonce and expiration timestamp. The backend must reject reused or expired nonces.

## Production logging

Safe to log:

- public key
- challenge ID
- verification status
- timestamp

Do not log:

- full raw signatures in verbose logs
- auth session tokens
- private keys or seed phrases
- API keys
