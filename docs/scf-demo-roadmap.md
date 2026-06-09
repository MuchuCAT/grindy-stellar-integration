# SCF Demo Roadmap

This document tracks the practical work needed to maximize the Stellar Community Fund submission quality.

## Completed

- Public open-source Stellar integration repository.
- Stellar wallet ownership package.
- Backend-safe signature verification package.
- Browser wallet ownership demo.
- Soroban `CampaignRewardVault` contract.
- Rust unit test for deposit and withdraw.
- Optimized WASM build.
- Testnet deployment.
- Testnet `init`, `deposit`, and `withdraw` transactions.
- Next.js reward vault demo UI with Freighter connection and vault transaction flow.

## Demo Contract

The current contract is intentionally small and reviewer-friendly:

- `init(admin)`: initializes the vault.
- `deposit(token, from, amount)`: wallet-authenticated deposit into the vault.
- `withdraw(token, to, amount)`: wallet-authenticated withdrawal from the vault.
- `balance(user)`: reads a wallet balance.
- `total_deposited()`: reads the vault total.
- `admin()`: reads the vault admin.

This maps to Grindy's future Stellar reward escrow path without claiming that the final audited production escrow is already complete.

## Next Work Before Submission Video

1. Record the live Grindy app at `https://app.grindy.fun` to show the existing campaign/dashboard traction.
2. Open the public repo and show the wallet packages, contract folder, and Next.js demo folder.
3. Open Stellar Expert links for deploy, init, deposit, and withdraw evidence.
4. Run `pnpm vault:ui` locally.
5. Connect Freighter on testnet.
6. Submit a small `deposit` transaction from the UI.
7. Show the transaction hash and event on Stellar Expert.
8. Explain that this is the first public settlement primitive for the submitted Stellar-native campaign layer.

## Suggested Video Flow Under 3 Minutes

1. 0:00-0:20: Facecam intro. "Grindy is already live as B2B campaign infrastructure. This repository demonstrates the first Stellar-native integration layer."
2. 0:20-0:50: Show live Grindy app: campaigns, profile, leaderboard/reward concepts.
3. 0:50-1:20: Show the public repo: wallet linking packages, Soroban vault contract, Next.js demo.
4. 1:20-2:10: Run the Next.js demo: connect Freighter, submit vault deposit, open transaction hash.
5. 2:10-2:40: Show Stellar Expert: deploy/init/deposit/withdraw and typed events.
6. 2:40-3:00: Close with scope: Stellar wallets, event indexing, Soroswap/Aquarius/Blend/DeFindex adapters, and reward settlement.

## Submission Framing

Use this wording:

"The existing Grindy product already validates the campaign engine. This open-source repo proves the first Stellar-specific primitives: wallet ownership, backend signature verification, a Soroban reward vault, and a testnet UI transaction. The submitted Stellar scope extends Grindy from read-only CEX activity tracking to Stellar-native wallet identity, on-chain campaign indexing, DeFi protocol adapters, scoring, leaderboards, and reward settlement."

Avoid this wording:

- "earn-to-X"
- "memecoin rewards app"
- "consumer rewards platform"
- "unrelated chain integrations are the core of this submission"
- "production escrow is already audited"
