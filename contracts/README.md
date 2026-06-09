# Contracts

This folder contains open-source Soroban contract work for Grindy's Stellar integration.

## Current Contract

- `campaign-reward-vault`: a testnet-ready vault demonstrating wallet-authenticated `deposit` and `withdraw` flows for a protocol-funded campaign reward pool.

## Build

```bash
pnpm contract:build
```

## Test

```bash
pnpm contract:test
```

## Product Boundary

The vault is a focused public proof for the Stellar reward-settlement path. The live Grindy campaign engine remains separate and already handles campaign setup, scoring, leaderboards, CEX tracking, analytics, and reward operations.

The future production Stellar settlement layer will extend this proof with campaign-specific escrow rules, finalization, reward allocations, pausing, refunds, and audited distribution logic.
