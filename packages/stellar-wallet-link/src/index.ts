import FreighterApi, {
	getAddress,
	getNetworkDetails,
	isConnected,
	requestAccess,
	signMessage,
} from "@stellar/freighter-api";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import { Networks, StrKey } from "@stellar/stellar-sdk";

export type StellarWalletConnection = {
	publicKey: string;
	network?: string;
	networkPassphrase?: string;
	wallet: "stellar-wallets-kit" | "freighter";
};

export type OwnershipMessageInput = {
	domain: string;
	userId: string;
	publicKey: string;
	nonce: string;
	issuedAt?: string;
	expiresAt?: string;
	statement?: string;
};

export type OwnershipSignature = {
	publicKey: string;
	message: string;
	signature: string;
	signatureEncoding: "base64" | "hex" | "utf8";
	signerAddress?: string;
	networkPassphrase?: string;
	wallet: "stellar-wallets-kit" | "freighter";
};

export function isValidStellarPublicKey(publicKey: string): boolean {
	return StrKey.isValidEd25519PublicKey(publicKey);
}

export function createNonce(byteLength = 16): string {
	const bytes = new Uint8Array(byteLength);
	globalThis.crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
		""
	);
}

export function buildOwnershipMessage(input: OwnershipMessageInput): string {
	const issuedAt = input.issuedAt ?? new Date().toISOString();
	const statement =
		input.statement ??
		"This signature only proves wallet ownership for Grindy profile linking. It does not authorize a transaction or move funds.";

	return [
		"Grindy Stellar Wallet Verification",
		"",
		`Domain: ${input.domain}`,
		`User ID: ${input.userId}`,
		`Stellar Public Key: ${input.publicKey}`,
		`Nonce: ${input.nonce}`,
		`Issued At: ${issuedAt}`,
		input.expiresAt ? `Expires At: ${input.expiresAt}` : null,
		"",
		statement,
	]
		.filter((line): line is string => line !== null)
		.join("\n");
}

export function initStellarWalletsKit(): typeof StellarWalletsKit {
	StellarWalletsKit.init({
		modules: defaultModules(),
		network: Networks.PUBLIC,
	});
	return StellarWalletsKit;
}

export async function connectWithStellarWalletsKit(): Promise<StellarWalletConnection> {
	initStellarWalletsKit();
	const { address } = await StellarWalletsKit.authModal();
	if (!isValidStellarPublicKey(address)) {
		throw new Error("Wallet returned an invalid Stellar public key");
	}
	const network = await StellarWalletsKit.getNetwork().catch(() => undefined);
	const connection: StellarWalletConnection = {
		publicKey: address,
		wallet: "stellar-wallets-kit",
	};

	if (network?.network) {
		connection.network = network.network;
	}
	if (network?.networkPassphrase) {
		connection.networkPassphrase = network.networkPassphrase;
	}

	return connection;
}

export async function connectWithFreighter(): Promise<StellarWalletConnection> {
	const connected = await isConnected();
	if (connected.error || !connected.isConnected) {
		throw new Error("Freighter is not connected or not installed");
	}

	const access = await requestAccess();
	if (access.error) {
		throw new Error(access.error.message ?? "Freighter access rejected");
	}

	const addressResponse = await getAddress();
	if (addressResponse.error) {
		throw new Error(
			addressResponse.error.message ?? "Unable to read Freighter address"
		);
	}

	if (!isValidStellarPublicKey(addressResponse.address)) {
		throw new Error("Freighter returned an invalid Stellar public key");
	}

	const network = await getNetworkDetails().catch(() => undefined);

	const connection: StellarWalletConnection = {
		publicKey: addressResponse.address,
		wallet: "freighter",
	};

	if (network?.network) {
		connection.network = network.network;
	}
	if (network?.networkPassphrase) {
		connection.networkPassphrase = network.networkPassphrase;
	}

	return connection;
}

export async function signOwnershipMessageWithKit(
	input: OwnershipMessageInput,
	networkPassphrase: string = Networks.PUBLIC
): Promise<OwnershipSignature> {
	initStellarWalletsKit();
	const message = buildOwnershipMessage(input);
	const { signedMessage, signerAddress } = await StellarWalletsKit.signMessage(
		message,
		{
			address: input.publicKey,
			networkPassphrase,
		}
	);

	const ownershipSignature: OwnershipSignature = {
		publicKey: input.publicKey,
		message,
		signature: signedMessage,
		signatureEncoding: "base64",
		networkPassphrase,
		wallet: "stellar-wallets-kit",
	};

	if (signerAddress) {
		ownershipSignature.signerAddress = signerAddress;
	}

	return ownershipSignature;
}

export async function signOwnershipMessageWithFreighter(
	input: OwnershipMessageInput,
	networkPassphrase: string = Networks.PUBLIC
): Promise<OwnershipSignature> {
	const message = buildOwnershipMessage(input);
	const response = await signMessage(message, {
		address: input.publicKey,
		networkPassphrase,
	});

	if (response.error) {
		throw new Error(response.error.message ?? "Freighter signature rejected");
	}

	if (!response.signedMessage) {
		throw new Error("Freighter returned an empty signature");
	}

	return {
		publicKey: input.publicKey,
		message,
		signature: normalizeFreighterSignature(response.signedMessage),
		signatureEncoding: "base64",
		signerAddress: response.signerAddress,
		networkPassphrase,
		wallet: "freighter",
	};
}

export { FreighterApi, StellarWalletsKit, Networks };

function normalizeFreighterSignature(signature: string | Uint8Array): string {
	if (typeof signature === "string") {
		return signature;
	}

	let binary = "";
	for (const byte of signature) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}
