# Soroswap Campaign Adapter

The Soroswap adapter converts successful Router swap events into Grindy's public `NormalizedCampaignEvent` schema. It is the first reference implementation of the adapter interface and demonstrates the complete attribution boundary between Stellar protocol activity and Grindy's hosted scoring engine.

## Public Testnet Source

- Router contract: `CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD`
- Fixture transaction: `48dc831a8865641b1af97d817454afa0a1e4643f7fbc7bd058988ef42d4b3318`
- Fixture ledger: `4084752`
- Closed at: `2026-08-11T10:39:53Z`
- Protocol event: `SoroswapRouter / swap`

The fixture stores the exact base64 XDR topics and value returned by Stellar RPC. Tests decode these values with `@stellar/stellar-sdk`; wallet, path and amounts are not copied from an off-chain index.

## Normalization

```text
Stellar RPC event
  -> verify successful Router invocation
  -> decode Soroban XDR
  -> attribute the event to SwapEvent.to
  -> validate campaign window, input asset and route
  -> preserve integer ledger precision
  -> emit NormalizedCampaignEvent + CampaignContribution
```

For the public fixture, the adapter proves the following transformation:

```json
{
  "protocol": "soroswap",
  "action": "swap",
  "wallet": "GDY2IB6RSKMLRFLAPPCLVRHPDAFYRL6V7SZDZP4QSHP3Y3XMGVDSYDN2",
  "amount": "200",
  "inputAssetCode": "XLM",
  "outputAmount": "20.4176977",
  "eligible": true
}
```

## Responsibility Boundary

The adapter proves and normalizes protocol activity. It does not select reward recipients, set scoring weights or distribute funds. Those decisions remain in the campaign rules, Grindy scoring engine and committed settlement manifest.

## Sources

- [Soroswap core contracts](https://github.com/soroswap/core)
- [Testnet deployment IDs](https://github.com/soroswap/core/blob/main/public/testnet.contracts.json)
- [Router event definitions](https://github.com/soroswap/core/blob/main/contracts/router/src/event.rs)
- [Testnet token metadata](https://github.com/soroswap/core/blob/main/public/tokens.json)
