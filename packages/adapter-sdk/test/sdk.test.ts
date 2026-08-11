import { describe, expect, it } from "vitest";
import { isEligibleTarget, isInsideCampaignWindow } from "../src/index";

describe("adapter SDK guards", () => {
	it("accepts activity inside an inclusive campaign window", () => {
		expect(
			isInsideCampaignWindow("2026-08-11T12:00:00.000Z", {
				startTime: "2026-08-11T00:00:00.000Z",
				endTime: "2026-08-12T00:00:00.000Z",
			})
		).toBe(true);
	});

	it("supports explicit and wildcard target allowlists", () => {
		expect(isEligibleTarget("XLM:USDC", [])).toBe(true);
		expect(isEligibleTarget("XLM:USDC", ["XLM:USDC"])).toBe(true);
		expect(isEligibleTarget("XLM:EURC", ["XLM:USDC"])).toBe(false);
	});
});
