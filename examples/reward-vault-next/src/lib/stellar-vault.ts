"use client";

import { signTransaction } from "@stellar/freighter-api";
import {
	Address,
	BASE_FEE,
	Contract,
	Networks,
	TransactionBuilder,
	nativeToScVal,
	rpc,
} from "@stellar/stellar-sdk";

export type VaultAction = "deposit" | "withdraw";

export type VaultInvokeInput = {
	action: VaultAction;
	publicKey: string;
	amount: string;
	vaultContractId: string;
	tokenContractId: string;
	rpcUrl?: string;
	networkPassphrase?: string;
};

export type VaultInvokeResult = {
	hash?: string;
	status: string;
	errorResultXdr?: string;
};

const DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org";
const DEFAULT_NETWORK_PASSPHRASE = Networks.TESTNET;

export async function invokeRewardVault(
	input: VaultInvokeInput
): Promise<VaultInvokeResult> {
	const rpcUrl = input.rpcUrl ?? DEFAULT_RPC_URL;
	const networkPassphrase =
		input.networkPassphrase ?? DEFAULT_NETWORK_PASSPHRASE;
	const server = new rpc.Server(rpcUrl, {
		allowHttp: rpcUrl.startsWith("http://"),
	});
	const sourceAccount = await server.getAccount(input.publicKey);
	const vault = new Contract(input.vaultContractId);

	const transaction = new TransactionBuilder(sourceAccount, { fee: BASE_FEE })
		.setNetworkPassphrase(networkPassphrase)
		.setTimeout(60)
		.addOperation(
			vault.call(
				input.action,
				new Address(input.tokenContractId).toScVal(),
				new Address(input.publicKey).toScVal(),
				nativeToScVal(toStroops(input.amount), { type: "i128" })
			)
		)
		.build();

	const prepared = await server.prepareTransaction(transaction);
	const signed = await signTransaction(prepared.toXDR(), {
		address: input.publicKey,
		networkPassphrase,
	});

	if (signed.error) {
		throw new Error(signed.error.message ?? "Freighter rejected transaction");
	}

	const signedTransaction = TransactionBuilder.fromXDR(
		signed.signedTxXdr,
		networkPassphrase
	);
	const result = await server.sendTransaction(signedTransaction);

	const invokeResult: VaultInvokeResult = {
		hash: result.hash,
		status: result.status,
	};
	const errorResultXdr = result.errorResult?.toXDR("base64");
	if (errorResultXdr) {
		invokeResult.errorResultXdr = errorResultXdr;
	}

	return invokeResult;
}

export function toStroops(value: string): bigint {
	const normalized = value.trim();
	if (!/^\d+(\.\d{0,7})?$/.test(normalized)) {
		throw new Error("Amount must be a positive decimal with up to 7 decimals");
	}

	const [whole = "0", decimal = ""] = normalized.split(".");
	const paddedDecimal = decimal.padEnd(7, "0");
	const stroops = BigInt(whole) * 10_000_000n + BigInt(paddedDecimal || "0");
	if (stroops <= 0n) {
		throw new Error("Amount must be greater than zero");
	}

	return stroops;
}
