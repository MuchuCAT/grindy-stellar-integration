"use client";

import { useMemo, useState } from "react";
import { connectWithFreighter } from "@grindy/stellar-wallet-link";
import { invokeRewardVault, type VaultAction } from "../lib/stellar-vault";

const rpcUrl =
	process.env.NEXT_PUBLIC_STELLAR_RPC_URL ??
	"https://soroban-testnet.stellar.org";
const networkPassphrase =
	process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
	"Test SDF Network ; September 2015";
const vaultContractId =
	process.env.NEXT_PUBLIC_REWARD_VAULT_CONTRACT_ID ??
	"CAIBPSOZD572Z6F7M36W3PWGXP2BNGTAXGPKZFU5DZ3QAQIRQ3MXGFIS";
const tokenContractId =
	process.env.NEXT_PUBLIC_DEMO_TOKEN_CONTRACT_ID ??
	"CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

type WalletState = {
	publicKey: string;
	network?: string | undefined;
};

export default function RewardVaultDemo() {
	const [wallet, setWallet] = useState<WalletState | null>(null);
	const [amount, setAmount] = useState("1");
	const [pendingAction, setPendingAction] = useState<VaultAction | null>(null);
	const [txHash, setTxHash] = useState<string | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const readyForTx = useMemo(
		() => Boolean(wallet && vaultContractId && tokenContractId),
		[wallet]
	);

	async function connect() {
		setError(null);
		setStatus("Opening Freighter...");
		try {
			const connection = await connectWithFreighter();
			setWallet({
				publicKey: connection.publicKey,
				network: connection.network,
			});
			setStatus("Wallet connected. Ready for a testnet vault transaction.");
		} catch (err) {
			setStatus(null);
			setError(err instanceof Error ? err.message : "Wallet connection failed");
		}
	}

	async function submit(action: VaultAction) {
		if (!wallet) return;
		setError(null);
		setTxHash(null);
		setPendingAction(action);
		setStatus(
			action === "deposit"
				? "Preparing deposit transaction..."
				: "Preparing withdraw transaction..."
		);

		try {
			const result = await invokeRewardVault({
				action,
				amount,
				publicKey: wallet.publicKey,
				rpcUrl,
				networkPassphrase,
				tokenContractId,
				vaultContractId,
			});
			setTxHash(result.hash ?? null);
			setStatus(`Transaction submitted: ${result.status}`);
			if (result.errorResultXdr) {
				setError(`RPC returned error XDR: ${result.errorResultXdr}`);
			}
		} catch (err) {
			setStatus(null);
			setError(err instanceof Error ? err.message : "Vault transaction failed");
		} finally {
			setPendingAction(null);
		}
	}

	return (
		<main className="stage">
			<section className="hero">
				<div className="hero-copy">
					<p className="eyebrow">Stellar Testnet Proof</p>
					<h1>Grindy Reward Vault</h1>
					<p>
						A Soroban demo for protocol-funded campaign rewards: connect a
						Stellar wallet, sign with Freighter, and execute a vault transaction
						on testnet.
					</p>
				</div>
				<div className="orb" aria-hidden="true" />
			</section>

			<section className="grid">
				<div className="panel panel-strong">
					<span className="panel-kicker">1 / Wallet</span>
					<h2>Connect Freighter</h2>
					<p>
						The wallet remains the user's custody layer. Grindy only asks for
						signatures and campaign transactions.
					</p>
					<button className="primary" onClick={connect} type="button">
						{wallet ? "Reconnect Wallet" : "Connect Wallet"}
					</button>
					{wallet ? (
						<div className="address-card">
							<span>Connected address</span>
							<strong>{shorten(wallet.publicKey)}</strong>
							<small>{wallet.network ?? "testnet selected in wallet"}</small>
						</div>
					) : null}
				</div>

				<div className="panel">
					<span className="panel-kicker">2 / Contract</span>
					<h2>CampaignRewardVault</h2>
					<p>
						This vault is the smallest on-chain primitive behind future Stellar
						reward escrow and distribution flows.
					</p>
					<div className="contract-list">
						<Row label="RPC" value={rpcUrl} />
						<Row
							label="Vault"
							value={vaultContractId || "pending testnet deployment"}
						/>
						<Row
							label="Token"
							value={tokenContractId || "pending demo asset contract"}
						/>
					</div>
				</div>

				<div className="panel transaction-panel">
					<span className="panel-kicker">3 / Transaction</span>
					<h2>Run a vault action</h2>
					<label htmlFor="amount">Amount</label>
					<input
						id="amount"
						inputMode="decimal"
						onChange={(event) => setAmount(event.target.value)}
						value={amount}
					/>
					<div className="button-row">
						<button
							className="primary"
							disabled={!readyForTx || pendingAction !== null}
							onClick={() => submit("deposit")}
							type="button"
						>
							{pendingAction === "deposit" ? "Depositing..." : "Deposit"}
						</button>
						<button
							className="secondary"
							disabled={!readyForTx || pendingAction !== null}
							onClick={() => submit("withdraw")}
							type="button"
						>
							{pendingAction === "withdraw" ? "Withdrawing..." : "Withdraw"}
						</button>
					</div>
					{!readyForTx ? (
						<p className="notice">
							Deploy the Soroban vault and fill the contract IDs in
							<code>.env.local</code> to enable transaction buttons.
						</p>
					) : null}
				</div>

				<div className="panel proof-panel">
					<span className="panel-kicker">4 / Evidence</span>
					<h2>Public proof</h2>
					<p>
						The demo produces a public testnet transaction hash with contract
						events that can be verified on Stellar Expert.
					</p>
					{status ? <div className="status">{status}</div> : null}
					{txHash ? (
						<a
							className="tx-link"
							href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
							rel="noreferrer"
							target="_blank"
						>
							View transaction
						</a>
					) : null}
					{error ? <div className="error">{error}</div> : null}
				</div>
			</section>
		</main>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="contract-row">
			<span>{label}</span>
			<strong title={value}>{shorten(value)}</strong>
		</div>
	);
}

function shorten(value: string) {
	if (!value) return "not configured";
	if (value.length <= 18) return value;
	return `${value.slice(0, 8)}...${value.slice(-8)}`;
}
