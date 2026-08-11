import type {
	AdapterResult,
	CampaignAdapterConfig,
	RawStellarActivity,
	StellarCampaignAdapter,
} from "@grindy/adapter-sdk";
import {
	isEligibleTarget,
	isInsideCampaignWindow,
} from "@grindy/adapter-sdk";
import {
	buildEventId,
	buildIdempotencyKey,
	type StellarNetwork,
} from "@grindy/campaign-event-schema";
import { scValToNative, xdr } from "@stellar/stellar-sdk";

export const SOROSWAP_TESTNET_ROUTER =
	"CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD";

export const SOROSWAP_TESTNET_TOKENS: Readonly<
	Record<string, SoroswapTokenMetadata>
> = {
	CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC: {
		code: "XLM",
		decimals: 7,
	},
};

export type SoroswapTokenMetadata = {
	code: string;
	decimals: number;
};

export type SoroswapRpcEvent = {
	type: "contract";
	ledger: number;
	ledgerClosedAt: string;
	contractId: string;
	id: string;
	operationIndex: number;
	transactionIndex: number;
	txHash: string;
	inSuccessfulContractCall: boolean;
	topic: string[];
	value: string;
};

export type DecodedSoroswapSwap = {
	amounts: bigint[];
	path: string[];
	to: string;
};

export type SoroswapAdapterOptions = {
	routerContractId?: string;
	tokens?: Readonly<Record<string, SoroswapTokenMetadata>>;
};

export class SoroswapAdapter implements StellarCampaignAdapter {
	readonly protocol = "soroswap";
	readonly version = "1.0.0";

	private readonly routerContractId: string;
	private readonly tokens: Readonly<Record<string, SoroswapTokenMetadata>>;

	constructor(options: SoroswapAdapterOptions = {}) {
		this.routerContractId =
			options.routerContractId ?? SOROSWAP_TESTNET_ROUTER;
		this.tokens = options.tokens ?? SOROSWAP_TESTNET_TOKENS;
	}

	supports(activity: RawStellarActivity): boolean {
		if (activity.contractId !== this.routerContractId) {
			return false;
		}

		try {
			const event = parseRpcEvent(activity.payload);
			return (
				event.inSuccessfulContractCall &&
				event.contractId === this.routerContractId &&
				isSwapTopic(event.topic)
			);
		} catch {
			return false;
		}
	}

	normalize(
		activity: RawStellarActivity,
		campaign: CampaignAdapterConfig
	): AdapterResult {
		if (!campaign.eligibleActions.includes("swap")) {
			return { eligible: false, reason: "unsupported_action" };
		}
		if (!isInsideCampaignWindow(activity.timestamp, campaign)) {
			return { eligible: false, reason: "outside_campaign_window" };
		}

		try {
			const rpcEvent = parseRpcEvent(activity.payload);
			if (
				activity.contractId !== this.routerContractId ||
				rpcEvent.contractId !== this.routerContractId ||
				!rpcEvent.inSuccessfulContractCall ||
				!isSwapTopic(rpcEvent.topic)
			) {
				return { eligible: false, reason: "malformed_activity" };
			}

			const swap = decodeSoroswapSwap(rpcEvent.value);
			const inputAsset = swap.path.at(0);
			const outputAsset = swap.path.at(-1);
			const inputAmount = swap.amounts.at(0);
			const outputAmount = swap.amounts.at(-1);
			if (
				!inputAsset ||
				!outputAsset ||
				inputAmount === undefined ||
				outputAmount === undefined ||
				swap.path.length < 2 ||
				swap.amounts.length !== swap.path.length ||
				inputAmount <= 0n ||
				outputAmount <= 0n
			) {
				return { eligible: false, reason: "malformed_activity" };
			}
			if (activity.wallet !== swap.to) {
				return { eligible: false, reason: "wallet_not_attributable" };
			}

			const pool = buildSoroswapPoolId(inputAsset, outputAsset);
			if (!isEligibleTarget(inputAsset, campaign.eligibleAssets)) {
				return { eligible: false, reason: "asset_not_eligible" };
			}
			if (!isEligibleTarget(pool, campaign.eligiblePools)) {
				return { eligible: false, reason: "pool_not_eligible" };
			}

			const inputToken = this.tokens[inputAsset] ?? {
				code: inputAsset,
				decimals: 7,
			};
			const outputToken = this.tokens[outputAsset] ?? {
				code: outputAsset,
				decimals: 7,
			};
			const amount = formatTokenAmount(inputAmount, inputToken.decimals);
			const eventIndex = parseEventIndex(rpcEvent.id);
			const operationIndex =
				activity.operationIndex ?? rpcEvent.operationIndex;
			const eventId = buildEventId({
				network: activity.network,
				transactionHash: activity.transactionHash,
				operationIndex,
				eventIndex,
			});

			return {
				eligible: true,
				event: {
					schemaVersion: "1.0",
					campaignId: campaign.campaignId,
					network: activity.network,
					wallet: swap.to,
					protocol: this.protocol,
					action: "swap",
					asset: inputAsset,
					pool,
					amount,
					ledger: activity.ledger,
					transactionHash: activity.transactionHash.toLowerCase(),
					timestamp: activity.timestamp,
					eventId,
					idempotencyKey: buildIdempotencyKey({
						campaignId: campaign.campaignId,
						eventId,
						action: "swap",
					}),
					origin: {
						kind: "soroban_event",
						contractId: this.routerContractId,
						operationIndex,
						eventIndex,
					},
					metadata: {
						inputAssetCode: inputToken.code,
						outputAssetCode: outputToken.code,
						outputAmount: formatTokenAmount(
							outputAmount,
							outputToken.decimals
						),
						pathLength: swap.path.length,
						protocolEventId: rpcEvent.id,
					},
				},
				contribution: {
					quantity: amount,
					unit: "asset",
				},
			};
		} catch {
			return { eligible: false, reason: "malformed_activity" };
		}
	}
}

export function rawActivityFromSoroswapRpcEvent(
	event: SoroswapRpcEvent,
	network: StellarNetwork = "testnet"
): RawStellarActivity {
	const swap = decodeSoroswapSwap(event.value);
	return {
		network,
		ledger: event.ledger,
		transactionHash: event.txHash,
		timestamp: event.ledgerClosedAt,
		wallet: swap.to,
		contractId: event.contractId,
		operationIndex: event.operationIndex,
		eventIndex: parseEventIndex(event.id),
		payload: event,
	};
}

export function decodeSoroswapSwap(valueXdr: string): DecodedSoroswapSwap {
	const native = scValToNative(xdr.ScVal.fromXDR(valueXdr, "base64"));
	if (!isRecord(native)) {
		throw new TypeError("Soroswap swap event value must decode to an object");
	}

	const { amounts, path, to } = native;
	if (
		!Array.isArray(amounts) ||
		!amounts.every((amount) => typeof amount === "bigint") ||
		!Array.isArray(path) ||
		!path.every((address) => typeof address === "string") ||
		typeof to !== "string"
	) {
		throw new TypeError("Soroswap swap event fields are malformed");
	}

	return {
		amounts: amounts as bigint[],
		path: path as string[],
		to,
	};
}

export function buildSoroswapPoolId(
	inputAsset: string,
	outputAsset: string
): string {
	return `${inputAsset}:${outputAsset}`;
}

export function formatTokenAmount(raw: bigint, decimals: number): string {
	if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 18) {
		throw new RangeError("token decimals must be an integer between 0 and 18");
	}
	const negative = raw < 0n;
	const absolute = negative ? -raw : raw;
	const scale = 10n ** BigInt(decimals);
	const whole = absolute / scale;
	const fraction = (absolute % scale)
		.toString()
		.padStart(decimals, "0")
		.replace(/0+$/, "");
	const formatted = fraction.length > 0 ? `${whole}.${fraction}` : `${whole}`;
	return negative ? `-${formatted}` : formatted;
}

function isSwapTopic(topic: string[]): boolean {
	if (topic.length < 2) {
		return false;
	}
	try {
		return (
			decodeScVal(topic[0] ?? "") === "SoroswapRouter" &&
			decodeScVal(topic[1] ?? "") === "swap"
		);
	} catch {
		return false;
	}
}

function decodeScVal(value: string): unknown {
	return scValToNative(xdr.ScVal.fromXDR(value, "base64"));
}

function parseRpcEvent(input: unknown): SoroswapRpcEvent {
	if (!isRecord(input)) {
		throw new TypeError("RPC event must be an object");
	}
	const requiredStrings = [
		"ledgerClosedAt",
		"contractId",
		"id",
		"txHash",
		"value",
	] as const;
	for (const key of requiredStrings) {
		if (typeof input[key] !== "string" || input[key].length === 0) {
			throw new TypeError(`RPC event ${key} is invalid`);
		}
	}
	if (
		input.type !== "contract" ||
		typeof input.ledger !== "number" ||
		typeof input.operationIndex !== "number" ||
		typeof input.transactionIndex !== "number" ||
		typeof input.inSuccessfulContractCall !== "boolean" ||
		!Array.isArray(input.topic) ||
		!input.topic.every((item) => typeof item === "string")
	) {
		throw new TypeError("RPC event fields are invalid");
	}
	return input as SoroswapRpcEvent;
}

function parseEventIndex(eventId: string): number {
	const suffix = eventId.split("-").at(-1);
	const parsed = suffix === undefined ? Number.NaN : Number.parseInt(suffix, 10);
	if (!Number.isSafeInteger(parsed) || parsed < 0) {
		throw new TypeError("RPC event id does not contain a valid event index");
	}
	return parsed;
}

function isRecord(input: unknown): input is Record<string, unknown> {
	return typeof input === "object" && input !== null && !Array.isArray(input);
}
