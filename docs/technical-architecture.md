# Grindy Stellar Technical Architecture

## 0. Executive Summary

Grindy is a live B2B campaign infrastructure product for crypto and DeFi protocols. Its current production engine supports campaign creation, participant enrollment, scoring, leaderboards, analytics, and reward operations. The existing MVP validates this model through read-only CEX integrations and completed campaign seasons.

The SCF Build extends that proven campaign engine into a Stellar-native product. Stellar becomes the identity, activity-data, scoring, and reward-settlement layer for campaigns based on swaps, liquidity provision, lending supply, and yield allocation. The extension adds verified Stellar wallet linking, on-chain event indexing, protocol adapters, Stellar campaign rules, and native reward settlement.

Grindy never takes custody of participant trading funds. Users interact directly with Stellar wallets and DeFi protocols. Protocol partners define campaigns and fund their reward pools.

## 1. Product Today

Grindy already operates the reusable product core required for protocol-funded campaigns:

- campaign dashboard and campaign management;
- user profiles and campaign enrollment;
- configurable campaign rules and eligibility periods;
- scoring and leaderboard calculation;
- reward records and settlement operations;
- participant and campaign analytics;
- read-only CEX API tracking;
- administration and campaign monitoring.

The current campaign model has been validated with real usage:

| Metric | Current traction |
| --- | ---: |
| Tracked trading volume | USD 310,000+ |
| Tracked trades | 5,300+ |
| Rewards distributed | USD 1,300+ |
| Registered users | 80+ |
| Active users | 30+ |
| Campaign seasons launched and settled | 3 |

The Stellar-native architecture preserves this campaign engine. It changes how participant identity is verified, how eligible activity is collected, and how rewards are settled.

## 2. Current vs Stellar-Native Architecture

| Product capability | Current Grindy | Stellar-native Grindy | Scope |
| --- | --- | --- | --- |
| Participant identity | Grindy user profile | Grindy profile linked to a verified Stellar public key | Existing core with Stellar connection |
| Campaign enrollment | Profile-based campaign join | Wallet-qualified enrollment against Stellar campaign rules | Existing core with Stellar connection |
| Activity tracking | Read-only CEX APIs and DEX beta data | Horizon, Stellar RPC, Soroban events, and protocol adapters | New Stellar-native data layer |
| Campaign rules | Exchange, pair, period, and volume rules | Protocol, pool, asset, action, duration, and ledger-time rules | Existing rule engine extended for Stellar |
| Scoring | Normalized trade events scored by campaign rules | Normalized on-chain actions scored by the same campaign engine | Existing core with Stellar event inputs |
| Leaderboards | Campaign participant rankings | Stellar wallet-linked rankings with on-chain provenance | Existing and reusable |
| Reward preparation | Reward records and administrative settlement | Final allocations linked to Stellar accounts and a settlement manifest | Existing core with Stellar connection |
| Simple reward settlement | Administrative payout flow | Claimable Balances | New Stellar-native settlement lane |
| Advanced reward settlement | Not available on-chain | Soroban campaign escrow and reward distribution | New Stellar-native settlement lane |
| Protocol coverage | Centralized exchange integrations | Soroswap, Aquarius, Blend v2, and DeFindex adapters | New Stellar-native integrations |

The existing campaign, scoring, leaderboard, analytics, and administration layers remain the product core. The SCF Build connects those capabilities to Stellar identity and on-chain data, then adds Stellar-native settlement.

## 3. Architecture at a Glance

### C4 System Context

```mermaid
flowchart LR
    participant["Campaign Participant"]
    partner["Protocol Partner"]

    subgraph core["Existing Grindy Core"]
        app["Web Application"]
        profiles["Profiles and Enrollment"]
        campaigns["Campaign Rules"]
        scoring["Scoring Engine"]
        leaderboard["Leaderboards and Analytics"]
        admin["Campaign Administration"]
        data[("Campaign Data Store")]
    end

    subgraph stellar["Stellar-Native Campaign Layer"]
        wallet["Stellar Wallets Kit / Freighter"]
        indexer["Stellar Event Indexer"]
        adapters["Protocol Adapters"]
        horizon["Horizon"]
        rpc["Stellar RPC and Soroban Events"]
        protocols["Soroswap / Aquarius / Blend / DeFindex"]
        simple["Claimable Balances"]
        advanced["CampaignEscrow / RewardDistributor"]
    end

    participant --> app
    participant --> wallet
    partner --> admin
    app --> profiles
    admin --> campaigns
    wallet --> profiles
    protocols --> horizon
    protocols --> rpc
    horizon --> indexer
    rpc --> indexer
    indexer --> adapters
    adapters --> scoring
    campaigns --> scoring
    scoring --> leaderboard
    profiles --> data
    campaigns --> data
    scoring --> data
    leaderboard --> data
    leaderboard --> simple
    leaderboard --> advanced
    simple --> participant
    advanced --> participant
```

### Campaign Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Participant
    participant Wallet as Stellar Wallet
    participant Protocol as Stellar DeFi Protocol
    participant Network as Horizon / Stellar RPC
    participant Indexer as Grindy Indexer
    participant Engine as Campaign and Scoring Engine
    participant Board as Leaderboard
    participant Settlement as Stellar Settlement

    User->>Wallet: Connect and prove wallet ownership
    Wallet-->>Engine: Verified Stellar public key
    User->>Engine: Join eligible campaign
    User->>Protocol: Perform eligible on-chain action
    Protocol-->>Network: Record operation or contract event
    Network-->>Indexer: Stream or return ledger activity
    Indexer->>Indexer: Normalize, deduplicate, and validate
    Indexer->>Engine: Submit eligible campaign event
    Engine->>Board: Update score and ranking
    Board->>Settlement: Finalize reward allocations
    Settlement-->>User: Claimable Balance or Soroban payout
```

## 4. Stellar Integration Components

### Stellar Wallets Kit and Freighter

Stellar Wallets Kit provides the wallet connection layer, with Freighter as the primary browser-wallet experience. A participant connects a wallet, signs a human-readable ownership message, and links the verified public key to an existing Grindy profile. Authentication remains separate from wallet ownership: the Stellar signature proves control of an address without replacing the Grindy account system or authorizing a token transfer.

### Horizon

Horizon provides account, transaction, operation, asset, and Claimable Balance data for classic Stellar activity. Grindy uses cursor-based ingestion for the operation streams relevant to each campaign and stores its own normalized campaign records for durable scoring and analytics.

### Stellar RPC and Soroban Events

Stellar RPC provides contract simulation, transaction submission, contract state, and recent event access. Soroban events are ingested continuously because RPC event retention is intentionally limited. Ledger cursors, transaction hashes, event indices, and contract identifiers form the basis of deterministic idempotency keys.

### Claimable Balances

Claimable Balances are the first production settlement lane for straightforward reward campaigns. After a leaderboard is finalized, Grindy prepares participant allocations and the protocol-funded reward account creates balances for the eligible Stellar accounts. Claimant predicates can support claim windows and a protocol recovery path after expiry.

### Soroban CampaignEscrow and RewardDistributor

Advanced campaigns use Soroban contracts when settlement requires an escrowed reward pool, campaign state, controlled finalization, batched distribution, participant claims, pause controls, or refunds. The contract layer holds only protocol-funded campaign rewards. It never holds participant trading or liquidity positions.

### Soroswap Adapter

The Soroswap adapter converts eligible swap activity into normalized campaign events. It validates the participant wallet, target assets or route, transaction status, amount, ledger time, and campaign window before sending the event to the scoring engine.

### Aquarius Adapter

The Aquarius adapter tracks eligible liquidity deposits, withdrawals, pool identity, position duration, and liquidity changes. Campaign rules can reward sustained liquidity rather than short-lived deposits.

### Blend v2 Adapter

The Blend v2 adapter tracks eligible supply activity, supported assets, market or pool identity, position changes, and duration. It supports stablecoin-supply and lending-participation campaigns.

### DeFindex Adapter

The DeFindex adapter tracks eligible strategy deposits, withdrawals, allocation changes, and position duration. It supports campaigns designed around sustained participation in selected yield strategies.

## 5. Stellar User Flow

1. A participant opens a Stellar campaign in Grindy.
2. The participant connects a compatible Stellar wallet through Stellar Wallets Kit or Freighter.
3. The wallet signs a human-readable ownership message containing the public key, domain, nonce, and expiration.
4. Grindy verifies the signature and links the Stellar public key to the participant profile.
5. The participant joins a campaign after wallet and campaign eligibility checks.
6. The participant performs an eligible action directly on the selected Stellar DeFi protocol.
7. Grindy ingests the operation or Soroban event and normalizes it through the corresponding protocol adapter.
8. The scoring engine validates campaign rules, updates the participant score, and refreshes the leaderboard.
9. At campaign close, Grindy finalizes allocations and records the final leaderboard hash.
10. Rewards settle through Claimable Balances or the Soroban advanced-settlement lane.

## 6. Protocol Partner Flow

1. A protocol partner creates a campaign from the Grindy administration interface.
2. The partner selects a campaign type: swap, liquidity provision, stablecoin supply, or yield allocation.
3. The partner selects the eligible protocol, pool or market, assets, campaign period, duration rules, and scoring weights.
4. The partner funds the reward pool through the configured Stellar settlement lane.
5. Participants join and perform eligible actions directly on Stellar.
6. Grindy indexes, normalizes, validates, and scores the activity.
7. The partner monitors campaign analytics and reviews the final leaderboard.
8. Grindy finalizes the campaign and rewards settle to participant Stellar accounts.

## 7. Reward Settlement Architecture

### A. Claimable Balances: Simple Production Campaigns

Claimable Balances are used when a campaign has a finalized recipient list and does not require custom on-chain state transitions.

1. The scoring engine freezes the final leaderboard and reward allocation manifest.
2. The protocol-funded settlement account creates one or more Claimable Balances for eligible participants.
3. Each allocation records its balance identifier and transaction hash in the campaign settlement log.
4. Participants claim rewards from their Stellar wallets within the configured claim period.
5. Expired or unclaimed allocations follow the campaign's declared recovery policy.

This lane minimizes contract complexity while preserving transparent, Stellar-native reward delivery.

### B. Soroban Escrow: Advanced Campaign Modes

Soroban is used when a campaign requires an on-chain funded lifecycle or programmable distribution.

| Contract | Purpose | Core responsibilities |
| --- | --- | --- |
| `CampaignRegistry` | Canonical campaign reference | Registers campaign metadata hash, status, settlement asset, and linked escrow. |
| `CampaignEscrow` | Protocol-funded reward custody | Accepts reward funding, enforces lifecycle state, supports pause, finalization, and refund paths. |
| `RewardDistributor` | Allocation settlement | Commits the final allocation manifest and supports batched payouts or participant claims with duplicate-claim prevention. |

Campaign contracts use explicit administrative and protocol roles, emit typed events for indexing, and expose auditable state. Production deployments use contract versioning, testnet validation, deployment records, and an emergency pause/refund path.

Across both lanes, Grindy does not custody participant trading funds. Reward pools are supplied by protocol partners and are separated from participant DeFi positions.

## 8. Security and Anti-Abuse

- **Wallet ownership proof:** every linked address requires a signed, expiring, single-use challenge.
- **Duplicate wallet prevention:** a Stellar address cannot be linked to multiple participant profiles.
- **Duplicate event prevention:** transaction hash, ledger, event index, protocol, and action data form deterministic idempotency keys.
- **Replay-safe ingestion:** each source maintains a checkpoint and reprocessing remains idempotent.
- **Campaign eligibility:** protocol, pool, asset, action, amount, and campaign time window are validated before scoring.
- **Liquidity quality controls:** minimum LP duration and short-duration deposit flags reduce incentive-only liquidity cycling.
- **Activity risk flags:** repeated counterparties, circular patterns, abnormal frequency, and related-wallet signals can trigger review.
- **Controlled finalization:** campaign results remain reviewable before the final leaderboard and allocation manifest are frozen.
- **Settlement integrity:** final leaderboard and allocation hashes create an auditable link between scoring and payout.
- **Audit trail:** wallet links, indexed events, score changes, campaign state changes, and settlement transactions are recorded.
- **Advanced-mode safeguards:** Soroban settlement includes role separation, duplicate-claim prevention, pause controls, and a refund path.

## 9. SCF Build Scope

### MVP

- Stellar wallet connection through Stellar Wallets Kit and Freighter;
- signed wallet ownership proof and wallet-to-profile linking;
- duplicate wallet-link prevention;
- Stellar campaign enrollment;
- Stellar event indexer MVP with durable cursors and idempotency;
- first protocol campaign adapter;
- Stellar event scoring and leaderboard updates.

### Testnet

- Soroswap swap-campaign flow;
- Aquarius liquidity-campaign flow;
- Blend v2 supply-campaign adapter;
- DeFindex yield-allocation adapter;
- Claimable Balance reward test flow;
- CampaignEscrow and RewardDistributor testnet contracts;
- end-to-end campaign simulation from wallet connection to reward settlement.

### Mainnet

- production Stellar indexing and monitoring;
- mainnet wallet identity and campaign enrollment;
- production protocol adapters;
- mainnet Claimable Balance settlement;
- mainnet Soroban advanced settlement;
- reusable campaign templates for swaps, liquidity, lending supply, and yield allocation.

## 10. Out of Scope for the Initial Mainnet Release

- Protocol reward pools, participant rewards, and prize pools are funded by protocol partners, not the SCF Build.
- Marketing and user-acquisition spending are outside the technical integration scope.
- Grindy does not custody participant trading funds or DeFi positions.
- Near Intents may be evaluated as a later cross-chain onboarding extension after the Stellar-native campaign flow is stable.
- Stellar Broker is not required for the first production release.

## 11. Technical Readiness Proof

The public [Grindy Stellar Integration repository](https://github.com/MuchuCAT/grindy-stellar-integration) contains working, independently testable Stellar modules:

- Stellar Wallets Kit and Freighter connection flows;
- human-readable wallet ownership message construction;
- backend-safe Ed25519 signature verification;
- browser wallet ownership demo;
- Next.js Freighter transaction demo;
- a Rust/Soroban `CampaignRewardVault` contract with deposit, withdraw, balance, and total-accounting functions;
- Soroban contract tests;
- a testnet deployment with verified deposit and withdrawal transactions;
- setup and local verification commands;
- MIT license.

**Live Stellar testnet demo:** [reward-vault-next.vercel.app](https://reward-vault-next.vercel.app)

| Testnet proof | Public reference |
| --- | --- |
| CampaignRewardVault contract | [`CAIBPSO...MXGFIS`](https://stellar.expert/explorer/testnet/contract/CAIBPSOZD572Z6F7M36W3PWGXP2BNGTAXGPKZFU5DZ3QAQIRQ3MXGFIS) |
| Contract deployment | [Stellar Expert transaction](https://stellar.expert/explorer/testnet/tx/2a4e53c86cc612df553c7b1fc21b6b4d8a0860c822ba3736c12b752a9fe386a6) |
| Contract initialization | [Stellar Expert transaction](https://stellar.expert/explorer/testnet/tx/43dd8010fb0558433da0e0d5e5ecf952e0d824cac5872d9347321fbd393c68dd) |
| Test deposit | [Stellar Expert transaction](https://stellar.expert/explorer/testnet/tx/11294adf236564f4ef164b3b1e1778b6ce831809aa8e2a1259623ad29fdfd79c) |
| Test withdrawal | [Stellar Expert transaction](https://stellar.expert/explorer/testnet/tx/b096ff71470b13fc3a5c7407dfcc8d6221664766fdd57361ce2e40224529acd5) |

The testnet vault is a deliberately narrow readiness proof. The production architecture separates simple Claimable Balance campaigns from advanced Soroban campaign escrow and distribution.

## 12. References

- [Grindy live application](https://app.grindy.fun)
- [Grindy Stellar Integration repository](https://github.com/MuchuCAT/grindy-stellar-integration)
- [Grindy Stellar testnet demo](https://reward-vault-next.vercel.app)
- [Stellar wallet integration](https://developers.stellar.org/docs/tools/developer-tools/wallets)
- [Freighter developer documentation](https://docs.freighter.app/)
- [Horizon API](https://developers.stellar.org/docs/data/apis/horizon)
- [Stellar RPC](https://developers.stellar.org/docs/data/apis/rpc)
- [Soroban event ingestion](https://developers.stellar.org/docs/build/guides/events/ingest)
- [Claimable Balances](https://developers.stellar.org/docs/build/guides/transactions/claimable-balances)
- [Stellar smart contracts](https://developers.stellar.org/docs/build/smart-contracts/overview)
