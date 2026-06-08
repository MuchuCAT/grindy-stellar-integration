import { StrKey } from "@stellar/stellar-sdk";
import nacl from "tweetnacl";

export type SignatureEncoding = "base64" | "hex" | "utf8";

export type VerifyStellarOwnershipSignatureInput = {
	publicKey: string;
	message: string;
	signature: string;
	signatureEncoding?: SignatureEncoding;
};

export function verifyStellarOwnershipSignature(
	input: VerifyStellarOwnershipSignatureInput
): boolean {
	if (!StrKey.isValidEd25519PublicKey(input.publicKey)) {
		return false;
	}

	const publicKeyBytes = StrKey.decodeEd25519PublicKey(input.publicKey);
	const messageBytes = new TextEncoder().encode(input.message);
	const signatureBytes = decodeSignature(
		input.signature,
		input.signatureEncoding ?? "base64"
	);

	if (signatureBytes.length !== nacl.sign.signatureLength) {
		return false;
	}

	return nacl.sign.detached.verify(
		messageBytes,
		signatureBytes,
		publicKeyBytes
	);
}

export function decodeSignature(
	signature: string,
	encoding: SignatureEncoding
): Uint8Array {
	switch (encoding) {
		case "base64":
			return Uint8Array.from(Buffer.from(signature, "base64"));
		case "hex":
			return Uint8Array.from(Buffer.from(signature, "hex"));
		case "utf8":
			return new TextEncoder().encode(signature);
		default: {
			const exhaustive: never = encoding;
			throw new Error(`Unsupported signature encoding: ${exhaustive}`);
		}
	}
}

