# Ownership Message

The ownership message is deterministic and human-readable so the user can understand what they are signing.

Example:

```text
Grindy Stellar Wallet Verification

Domain: app.grindy.fun
User ID: user_123
Stellar Public Key: G...
Nonce: 4fd632d2c48ad0bc
Issued At: 2026-06-08T10:00:00.000Z
Expires At: 2026-06-08T10:10:00.000Z

This signature only proves wallet ownership for Grindy profile linking. It does not authorize a transaction or move funds.
```

Required fields:

- domain
- user ID
- Stellar public key
- nonce
- issued at
- expiration

Backend checks:

- public key is a valid Stellar Ed25519 public key
- nonce exists and has not been used before
- message has not expired
- signature verifies against the public key and message bytes
- wallet is not already linked to another profile

