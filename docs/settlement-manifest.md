# Settlement Manifest

A settlement manifest is the immutable output of a finalized Grindy leaderboard. It records the campaign allocation without moving scoring logic into the smart contracts.

```json
{
  "schemaVersion": "1.0",
  "campaignId": "grindy-stellar-testnet-campaign-001",
  "network": "testnet",
  "rewardAsset": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  "allocationTotal": "70.0000000",
  "participantCount": 1,
  "finalLeaderboardHash": "80185e7922159506f39b5c39bb028f7d55d511938d408d8c8e913bbacbf80dc5",
  "allocationRoot": "27f185b31c6c785856541b5222efc76d4ea188a802b22b7a85a0c776709f11db",
  "generatedAt": "2026-08-11T12:00:00.000Z",
  "allocations": [
    {
      "wallet": "GDY2IB6RSKMLRFLAPPCLVRHPDAFYRL6V7SZDZP4QSHP3Y3XMGVDSYDN2",
      "amount": "70.0000000",
      "rank": 1
    }
  ]
}
```

## Commitment Rules

1. The scoring engine freezes the final leaderboard.
2. Allocations are sorted deterministically by wallet address.
3. Each contract leaf contains `campaign_id`, `wallet`, and the reward amount in the asset's integer precision.
4. Leaves use Soroban XDR encoding and SHA-256, matching `RewardDistributor::allocation_leaf_hash`.
5. Parent nodes are SHA-256 hashes of `left || right`; proofs retain left/right position.
6. The resulting root, total amount, and participant count are committed once.
7. A wallet can claim once with a valid proof, or the administrator can submit a verified batch.
8. Unclaimed funds return to the protocol owner only after the claim deadline.

The manifest is public campaign evidence. It contains no private user data beyond public Stellar addresses and reward allocations.

Campaign #001 committed this allocation root in [transaction `a827bfa7...9cd83`](https://stellar.expert/explorer/testnet/tx/a827bfa7431f1b3fcb7d4c88ebcbec86cfcee636e5ad9c924f5e21e97b39cd83) and distributed the reward in [transaction `b175e9ec...9ca7e`](https://stellar.expert/explorer/testnet/tx/b175e9ec332a9f02538411c2d6022a77aa27da7db4276451047511c418c9ca7e).

The participant-controlled settlement path is independently verifiable on testnet. An isolated [`RewardDistributor` deployment](https://stellar.expert/explorer/testnet/contract/CDARFIGMVZSLG6SXBSDTFKEVKANSF7567PIRIFUVGKDYA2KTIGVBBUPE) committed allocation root `40049eaabdb8bff4cfd9c6415764d50eb16d23fcf7f84cb30b58c5563383820e` in [transaction `186fd4f5...8ded2`](https://stellar.expert/explorer/testnet/tx/186fd4f50c862ebfabe9135e1c4d36cf7174c9f15049c34f748caef2e278ded2). Wallet `GAGYWKQODZL2SPZUCI3T2OESE4FT2GQM42L6RIY2A6N7UCXJUBYIHX6T` then authorized [`claim()`](https://stellar.expert/explorer/testnet/tx/2eafa9566d2863bd8124c6b2be6dd96a48a0f747473e4cb49e408d9cb0b399b2) and received 10 XLM. This proof is separate from Campaign #001's 70 XLM batch settlement so both payout lanes remain independently auditable.
