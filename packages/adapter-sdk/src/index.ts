import type {
	CampaignAction,
	NormalizedCampaignEvent,
	StellarNetwork,
} from "@grindy/campaign-event-schema";

export type RawStellarActivity = {
	network: StellarNetwork;
	ledger: number;
	transactionHash: string;
	timestamp: string;
	wallet: string;
	contractId?: string;
	operationIndex?: number;
	eventIndex?: number;
	payload: unknown;
};

export type CampaignAdapterConfig = {
	campaignId: string;
	protocol: string;
	startTime: string;
	endTime: string;
	eligibleActions: readonly CampaignAction[];
	eligibleAssets: readonly string[];
	eligiblePools: readonly string[];
};

export type CampaignContribution = {
	quantity: string;
	unit: "asset" | "usd" | "seconds" | "asset_seconds";
	durationSeconds?: number;
};

export type AdapterResult =
	| {
		eligible: true;
		event: NormalizedCampaignEvent;
		contribution: CampaignContribution;
	}
	| {
		eligible: false;
		reason:
			| "unsupported_action"
			| "asset_not_eligible"
			| "pool_not_eligible"
			| "outside_campaign_window"
			| "malformed_activity"
			| "wallet_not_attributable";
	};

/**
 * Adapters interpret protocol records; they do not own score weights or rewards.
 * The hosted campaign engine consumes the normalized event and contribution.
 */
export interface StellarCampaignAdapter {
	readonly protocol: string;
	readonly version: string;
	supports(activity: RawStellarActivity): boolean;
	normalize(
		activity: RawStellarActivity,
		campaign: CampaignAdapterConfig
	): AdapterResult;
}

export function isInsideCampaignWindow(
	timestamp: string,
	campaign: Pick<CampaignAdapterConfig, "startTime" | "endTime">
): boolean {
	const eventTime = Date.parse(timestamp);
	const start = Date.parse(campaign.startTime);
	const end = Date.parse(campaign.endTime);
	return (
		Number.isFinite(eventTime) &&
		Number.isFinite(start) &&
		Number.isFinite(end) &&
		eventTime >= start &&
		eventTime <= end
	);
}

export function isEligibleTarget(
	value: string,
	allowlist: readonly string[]
): boolean {
	return allowlist.length === 0 || allowlist.includes(value);
}
