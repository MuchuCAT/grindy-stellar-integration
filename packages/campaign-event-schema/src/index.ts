export const CAMPAIGN_EVENT_SCHEMA_VERSION = "1.0" as const;

export const CAMPAIGN_ACTIONS = [
	"swap",
	"lp_deposit",
	"lp_withdrawal",
	"lending_supply",
	"lending_withdrawal",
	"yield_allocation",
	"yield_withdrawal",
	"reward_funding",
	"reward_claim",
] as const;

export type CampaignAction = (typeof CAMPAIGN_ACTIONS)[number];
export type StellarNetwork = "testnet" | "public";
export type CampaignEventSource = "horizon_operation" | "soroban_event";
export type CampaignEventMetadataValue = string | number | boolean;

export type CampaignEventOrigin = {
	kind: CampaignEventSource;
	contractId?: string;
	operationIndex?: number;
	eventIndex?: number;
};

/**
 * Protocol-specific records become this stable representation before scoring.
 * Amounts remain decimal strings so adapters never lose ledger precision.
 */
export type NormalizedCampaignEvent = {
	schemaVersion: typeof CAMPAIGN_EVENT_SCHEMA_VERSION;
	campaignId: string;
	network: StellarNetwork;
	wallet: string;
	protocol: string;
	action: CampaignAction;
	asset: string;
	pool: string;
	amount: string;
	ledger: number;
	transactionHash: string;
	timestamp: string;
	eventId: string;
	idempotencyKey: string;
	origin: CampaignEventOrigin;
	metadata?: Record<string, CampaignEventMetadataValue>;
};

export type CampaignEventValidation =
	| { valid: true; event: NormalizedCampaignEvent }
	| { valid: false; errors: string[] };

const STELLAR_ACCOUNT_PATTERN = /^G[A-Z2-7]{55}$/;
const TRANSACTION_HASH_PATTERN = /^[a-fA-F0-9]{64}$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

export function validateCampaignEvent(
	input: unknown
): CampaignEventValidation {
	if (!isRecord(input)) {
		return { valid: false, errors: ["event must be an object"] };
	}

	const errors: string[] = [];
	if (input.schemaVersion !== CAMPAIGN_EVENT_SCHEMA_VERSION) {
		errors.push(`schemaVersion must be ${CAMPAIGN_EVENT_SCHEMA_VERSION}`);
	}
	requireNonEmptyString(input, "campaignId", errors);
	if (input.network !== "testnet" && input.network !== "public") {
		errors.push("network must be testnet or public");
	}
	if (
		typeof input.wallet !== "string" ||
		!STELLAR_ACCOUNT_PATTERN.test(input.wallet)
	) {
		errors.push("wallet must be a Stellar G-address");
	}
	requireNonEmptyString(input, "protocol", errors);
	if (!CAMPAIGN_ACTIONS.includes(input.action as CampaignAction)) {
		errors.push("action is not supported by schema version 1.0");
	}
	requireNonEmptyString(input, "asset", errors);
	requireNonEmptyString(input, "pool", errors);
	if (
		typeof input.amount !== "string" ||
		!POSITIVE_DECIMAL_PATTERN.test(input.amount)
	) {
		errors.push("amount must be a non-negative decimal string");
	}
	if (
		typeof input.ledger !== "number" ||
		!Number.isSafeInteger(input.ledger) ||
		input.ledger < 0
	) {
		errors.push("ledger must be a non-negative safe integer");
	}
	if (
		typeof input.transactionHash !== "string" ||
		!TRANSACTION_HASH_PATTERN.test(input.transactionHash)
	) {
		errors.push("transactionHash must be a 32-byte hexadecimal hash");
	}
	if (
		typeof input.timestamp !== "string" ||
		Number.isNaN(Date.parse(input.timestamp))
	) {
		errors.push("timestamp must be an ISO-8601 date");
	}
	requireNonEmptyString(input, "eventId", errors);
	requireNonEmptyString(input, "idempotencyKey", errors);
	validateOrigin(input.origin, errors);
	validateMetadata(input.metadata, errors);

	if (errors.length > 0) {
		return { valid: false, errors };
	}
	return { valid: true, event: input as NormalizedCampaignEvent };
}

export function assertCampaignEvent(
	input: unknown
): asserts input is NormalizedCampaignEvent {
	const result = validateCampaignEvent(input);
	if (!result.valid) {
		throw new TypeError(result.errors.join("; "));
	}
}

export function buildEventId(input: {
	network: StellarNetwork;
	transactionHash: string;
	operationIndex?: number;
	eventIndex?: number;
}): string {
	return [
		input.network,
		input.transactionHash.toLowerCase(),
		input.operationIndex ?? "operation",
		input.eventIndex ?? "event",
	].join(":");
}

export function buildIdempotencyKey(input: {
	campaignId: string;
	eventId: string;
	action: CampaignAction;
}): string {
	return `${input.campaignId}:${input.eventId}:${input.action}`;
}

function isRecord(input: unknown): input is Record<string, unknown> {
	return typeof input === "object" && input !== null && !Array.isArray(input);
}

function requireNonEmptyString(
	input: Record<string, unknown>,
	key: string,
	errors: string[]
) {
	if (typeof input[key] !== "string" || input[key].trim().length === 0) {
		errors.push(`${key} must be a non-empty string`);
	}
}

function validateOrigin(input: unknown, errors: string[]) {
	if (!isRecord(input)) {
		errors.push("origin must be an object");
		return;
	}
	if (input.kind !== "horizon_operation" && input.kind !== "soroban_event") {
		errors.push("origin.kind must be horizon_operation or soroban_event");
	}
	for (const key of ["operationIndex", "eventIndex"] as const) {
		if (
			input[key] !== undefined &&
			(typeof input[key] !== "number" ||
				!Number.isSafeInteger(input[key]) ||
				input[key] < 0)
		) {
			errors.push(`origin.${key} must be a non-negative safe integer`);
		}
	}
	if (input.contractId !== undefined && typeof input.contractId !== "string") {
		errors.push("origin.contractId must be a string");
	}
}

function validateMetadata(input: unknown, errors: string[]) {
	if (input === undefined) {
		return;
	}
	if (!isRecord(input)) {
		errors.push("metadata must be an object");
		return;
	}
	for (const [key, value] of Object.entries(input)) {
		if (!["string", "number", "boolean"].includes(typeof value)) {
			errors.push(`metadata.${key} must be a scalar value`);
		}
	}
}
