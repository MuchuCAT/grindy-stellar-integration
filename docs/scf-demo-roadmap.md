# SCF Demo Roadmap

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

This maps to Grindy's future Stellar reward escrow path without claiming that the final audited production escrow is already complete
