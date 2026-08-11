# Grindy Campaign Event Schema

`NormalizedCampaignEvent` is the public boundary between Stellar protocol data and the Grindy scoring engine. An adapter must emit this structure before an action can be evaluated by campaign rules.

```json
{
  "schemaVersion": "1.0",
  "campaignId": "grindy-stellar-testnet-campaign-001",
  "network": "testnet",
  "wallet": "GDY2IB6RSKMLRFLAPPCLVRHPDAFYRL6V7SZDZP4QSHP3Y3XMGVDSYDN2",
  "protocol": "soroswap",
  "action": "swap",
  "asset": "XLM",
  "amount": "200",
  "ledger": 4084752,
  "transactionHash": "48dc831a8865641b1af97d817454afa0a1e4643f7fbc7bd058988ef42d4b3318",
  "timestamp": "2026-08-11T10:39:53Z",
  "eventId": "0017543876252295168-0000000004",
  "idempotencyKey": "grindy-stellar-testnet-campaign-001:<event-id>:swap",
  "origin": {
    "kind": "soroban_event",
    "contractId": "CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD",
    "eventIndex": 4
  }
}
```

## Invariants

- Amounts use decimal strings. Floating point values are not accepted.
- Wallet identity is a Stellar `G...` account.
- `eventId` identifies the immutable ledger record independently of a campaign.
- `idempotencyKey` combines campaign, event, and action so retries cannot score the same contribution twice.
- Protocol-specific details remain in adapter fixtures or scalar metadata; scoring consumes only normalized fields and a standardized contribution.
- Adapters determine whether an activity is structurally eligible. Campaign weights and reward decisions remain outside the adapter.

The executable schema and runtime validator live in [`packages/campaign-event-schema`](../packages/campaign-event-schema).

The first executable fixture lives in [`adapters/soroswap/test/fixtures/swap-event.ts`](../adapters/soroswap/test/fixtures/swap-event.ts). It decodes a [real public Soroswap testnet transaction](https://stellar.expert/explorer/testnet/tx/48dc831a8865641b1af97d817454afa0a1e4643f7fbc7bd058988ef42d4b3318) into an eligible 200 XLM campaign contribution.
