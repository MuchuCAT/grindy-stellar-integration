import type { CampaignAdapterConfig } from "@grindy/adapter-sdk";
import { describe, expect, it } from "vitest";
import {
	buildSoroswapPoolId,
	decodeSoroswapSwap,
	rawActivityFromSoroswapRpcEvent,
	SoroswapAdapter,
} from "../src/index";
import { soroswapSwapEventFixture } from "./fixtures/swap-event";

const inputAsset =
	"CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const outputAsset =
	"CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const pool = buildSoroswapPoolId(inputAsset, outputAsset);
const activity = rawActivityFromSoroswapRpcEvent(soroswapSwapEventFixture);
const campaign: CampaignAdapterConfig = {
	campaignId: "grindy-stellar-testnet-campaign-001",
	protocol: "soroswap",
	startTime: "2026-08-11T00:00:00Z",
	endTime: "2026-08-12T00:00:00Z",
	eligibleActions: ["swap"],
	eligibleAssets: [inputAsset],
	eligiblePools: [pool],
};

describe("SoroswapAdapter", () => {
	it("turns a real successful testnet Router event into a normalized event", () => {
		const adapter = new SoroswapAdapter();
		const result = adapter.normalize(activity, campaign);

		expect(result.eligible).toBe(true);
		if (!result.eligible) return;
		expect(result.event.wallet).toBe(
			"GDY2IB6RSKMLRFLAPPCLVRHPDAFYRL6V7SZDZP4QSHP3Y3XMGVDSYDN2"
		);
		expect(result.event.action).toBe("swap");
		expect(result.event.asset).toBe(inputAsset);
		expect(result.event.pool).toBe(pool);
		expect(result.event.amount).toBe("200");
		expect(result.event.metadata?.outputAmount).toBe("20.4176977");
		expect(result.event.metadata?.inputAssetCode).toBe("XLM");
		expect(result.contribution).toEqual({ quantity: "200", unit: "asset" });
	});

	it("produces stable event and idempotency identifiers", () => {
		const adapter = new SoroswapAdapter();
		const first = adapter.normalize(activity, campaign);
		const second = adapter.normalize(activity, campaign);
		expect(first).toEqual(second);
		if (!first.eligible) return;
		expect(first.event.eventId).toBe(
			`testnet:${soroswapSwapEventFixture.txHash}:0:4`
		);
	});

	it("rejects a wallet that is not the swap recipient", () => {
		const adapter = new SoroswapAdapter();
		const result = adapter.normalize(
			{ ...activity, wallet: `G${"A".repeat(55)}` },
			campaign
		);
		expect(result).toEqual({
			eligible: false,
			reason: "wallet_not_attributable",
		});
	});

	it("applies campaign pool and time boundaries", () => {
		const adapter = new SoroswapAdapter();
		expect(
			adapter.normalize(activity, { ...campaign, eligiblePools: ["other"] })
		).toEqual({ eligible: false, reason: "pool_not_eligible" });
		expect(
			adapter.normalize(activity, {
				...campaign,
				startTime: "2026-08-12T00:00:00Z",
				endTime: "2026-08-13T00:00:00Z",
			})
		).toEqual({ eligible: false, reason: "outside_campaign_window" });
	});

	it("ignores failed or malformed protocol events", () => {
		const adapter = new SoroswapAdapter();
		const failedEvent = {
			...soroswapSwapEventFixture,
			inSuccessfulContractCall: false,
		};
		const failedActivity = rawActivityFromSoroswapRpcEvent(failedEvent);
		expect(adapter.supports(failedActivity)).toBe(false);
		expect(adapter.normalize(failedActivity, campaign)).toEqual({
			eligible: false,
			reason: "malformed_activity",
		});
	});

	it("decodes the public XDR fixture without relying on indexed metadata", () => {
		const decoded = decodeSoroswapSwap(soroswapSwapEventFixture.value);
		expect(decoded.amounts).toEqual([2_000_000_000n, 204_176_977n]);
		expect(decoded.path).toEqual([inputAsset, outputAsset]);
	});
});
