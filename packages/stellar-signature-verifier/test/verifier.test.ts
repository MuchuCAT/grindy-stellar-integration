import { Keypair } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import {
	encodeSep53Message,
	verifyStellarOwnershipSignature,
} from "../src/index";

describe("verifyStellarOwnershipSignature", () => {
	it("verifies a valid SEP-53 Stellar signature returned by Freighter", () => {
		const keypair = Keypair.random();
		const message = "Grindy Stellar Wallet Verification\nNonce: test";
		const signature = keypair.sign(encodeSep53Message(message)).toString("base64");

		expect(
			verifyStellarOwnershipSignature({
				publicKey: keypair.publicKey(),
				message,
				signature,
				signatureEncoding: "base64",
			})
		).toBe(true);
	});

	it("rejects signatures for a different message", () => {
		const keypair = Keypair.random();
		const message = "original message";
		const signature = keypair.sign(encodeSep53Message(message)).toString("base64");

		expect(
			verifyStellarOwnershipSignature({
				publicKey: keypair.publicKey(),
				message: "tampered message",
				signature,
			})
		).toBe(false);
	});

	it("rejects a raw Ed25519 signature that does not use SEP-53", () => {
		const keypair = Keypair.random();
		const message = "Grindy Stellar Wallet Verification\nNonce: test";
		const signature = keypair.sign(Buffer.from(message)).toString("base64");

		expect(
			verifyStellarOwnershipSignature({
				publicKey: keypair.publicKey(),
				message,
				signature,
			})
		).toBe(false);
	});

	it("rejects invalid public keys", () => {
		expect(
			verifyStellarOwnershipSignature({
				publicKey: "not-a-stellar-public-key",
				message: "message",
				signature: "signature",
			})
		).toBe(false);
	});
});
