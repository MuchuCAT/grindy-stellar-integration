import { describe, expect, it } from "vitest";
import {
	buildEventId,
	buildIdempotencyKey,
	validateCampaignEvent,
} from "../src/index";

const transactionHash = "ab".repeat(32);
const eventId = buildEventId({
	network: "testnet",
	transactionHash,
	operationIndex: 2,
	eventIndex: 0,
});

const validEvent = {
	schemaVersion: "1.0",
	campaignId: "stellar-testnet-001",
	network: "testnet",
	wallet: `G${"A".repeat(55)}`,
	protocol: "soroswap",
	action: "swap",
	asset: "native:XLM",
	pool: "XLM:USDC",
	amount: "125.5000000",
	ledger: 123_456,
	transactionHash,
	timestamp: "2026-08-11T12:00:00.000Z",
	eventId,
	idempotencyKey: buildIdempotencyKey({
		campaignId: "stellar-testnet-001",
		eventId,
		action: "swap",
	}),
	origin: {
		kind: "soroban_event",
		contractId: `C${"B".repeat(55)}`,
		eventIndex: 0,
	},
} as const;

describe("NormalizedCampaignEvent", () => {
	it("accepts a canonical Stellar campaign event", () => {
		const result = validateCampaignEvent(validEvent);
		expect(result.valid).toBe(true);
	});

	it("rejects floating point amounts and invalid wallet identities", () => {
		const result = validateCampaignEvent({
			...validEvent,
			wallet: "not-a-wallet",
			amount: 125.5,
		});
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.errors).toContain("wallet must be a Stellar G-address");
			expect(result.errors).toContain(
				"amount must be a non-negative decimal string"
			);
		}
	});

	it("builds deterministic event and idempotency identifiers", () => {
		expect(eventId).toBe(`testnet:${transactionHash}:2:0`);
		expect(validEvent.idempotencyKey).toBe(
			`stellar-testnet-001:${eventId}:swap`
		);
	});
});
