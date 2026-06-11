"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { isConnected as isFreighterConnected } from "@stellar/freighter-api";
import { verifyStellarOwnershipSignature } from "@grindy/stellar-signature-verifier";
import {
	connectWithFreighter,
	createNonce,
	signOwnershipMessageWithFreighter,
	type OwnershipSignature,
} from "@grindy/stellar-wallet-link";
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

const githubUrl = "https://github.com/MuchuCAT/grindy-stellar-integration";
const architectureUrl = `${githubUrl}/blob/main/docs/technical-architecture.md`;
const contractUrl = `https://stellar.expert/explorer/testnet/contract/${vaultContractId}`;

type WalletState = {
	publicKey: string;
	network: string | undefined;
	networkPassphrase: string | undefined;
};

type LabView = "identity" | "vault";

const capabilities = [
	{
		index: "01",
		title: "Wallet identity",
		text: "Link a Stellar public key to an existing Grindy profile through a human-readable ownership signature.",
		icon: "identity",
	},
	{
		index: "02",
		title: "Activity adapters",
		text: "Normalize swaps, LP positions, lending supply, and yield allocations into campaign scoring inputs.",
		icon: "activity",
	},
	{
		index: "03",
		title: "Campaign scoring",
		text: "Feed verified Stellar events into the existing Grindy campaign, leaderboard, and analytics engine.",
		icon: "score",
	},
	{
		index: "04",
		title: "Vault settlement proof",
		text: "Use a deployed Soroban testnet primitive to prove authenticated reward-pool deposits and withdrawals.",
		icon: "settlement",
	},
];

export default function StellarDemo() {
	const [wallet, setWallet] = useState<WalletState | null>(null);
	const [labView, setLabView] = useState<LabView>("identity");
	const [proof, setProof] = useState<OwnershipSignature | null>(null);
	const [proofValid, setProofValid] = useState<boolean | null>(null);
	const [amount, setAmount] = useState("1");
	const [pendingAction, setPendingAction] = useState<VaultAction | null>(null);
	const [txHash, setTxHash] = useState<string | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [demoGuideOpen, setDemoGuideOpen] = useState(false);

	const isTestnetWallet = wallet?.networkPassphrase === networkPassphrase;
	const readyForTx = Boolean(
		wallet && isTestnetWallet && vaultContractId && tokenContractId
	);

	useEffect(() => {
		if (!demoGuideOpen) return;

		const previousOverflow = document.body.style.overflow;
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setDemoGuideOpen(false);
		};

		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", closeOnEscape);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", closeOnEscape);
		};
	}, [demoGuideOpen]);

	async function hasFreighter(): Promise<boolean> {
		try {
			const availability = await isFreighterConnected();
			return !availability.error && availability.isConnected;
		} catch {
			return false;
		}
	}

	function startDemo() {
		setDemoGuideOpen(true);
	}

	async function connect() {
		setError(null);
		if (!(await hasFreighter())) {
			setStatus(null);
			setDemoGuideOpen(true);
			return;
		}
		setStatus("Opening Freighter...");
		try {
			const connection = await connectWithFreighter();
			if (connection.networkPassphrase !== networkPassphrase) {
				setWallet(null);
				setStatus(null);
				setError(
					`Freighter is connected to ${connection.network ?? "another network"}. Switch Freighter to Testnet, then reconnect.`
				);
				return;
			}
			setWallet({
				publicKey: connection.publicKey,
				network: connection.network,
				networkPassphrase: connection.networkPassphrase,
			});
			setProof(null);
			setProofValid(null);
			setStatus("Wallet connected to the Stellar demo.");
		} catch (err) {
			setStatus(null);
			setError(err instanceof Error ? err.message : "Wallet connection failed");
		}
	}

	async function signOwnershipProof() {
		if (!wallet) return;
		setError(null);
		setStatus("Preparing ownership message...");
		try {
			const now = new Date();
			const signed = await signOwnershipMessageWithFreighter(
				{
					domain: window.location.host,
					userId: "grindy-stellar-demo",
					publicKey: wallet.publicKey,
					nonce: createNonce(),
					issuedAt: now.toISOString(),
					expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
				},
				wallet.networkPassphrase ?? networkPassphrase
			);

			const valid = verifyStellarOwnershipSignature({
				publicKey: signed.publicKey,
				message: signed.message,
				signature: signed.signature,
				signatureEncoding: signed.signatureEncoding,
			});
			setProof(signed);
			setProofValid(valid);
			setStatus(valid ? "Ownership signature verified locally." : null);
			if (!valid) setError("The ownership signature could not be verified.");
		} catch (err) {
			setStatus(null);
			setError(err instanceof Error ? err.message : "Ownership signing failed");
		}
	}

	async function submit(action: VaultAction) {
		if (!wallet) return;
		setError(null);
		setTxHash(null);
		setPendingAction(action);
		setStatus(`Preparing ${action} transaction...`);

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

	function openLab(view: LabView) {
		setLabView(view);
		document.getElementById("lab")?.scrollIntoView({ behavior: "smooth" });
	}

	return (
		<main>
			<header className="site-header">
				<a className="brand" href="#top" aria-label="Grindy x Stellar home">
					<Image alt="Grindy G" className="brand-logo" height={52} priority src="/brand/grindy-g-transparent.png" width={56} />
					<span className="brand-name">Grindy</span>
					<span className="brand-cross">×</span>
					<span className="stellar-lockup"><StellarMark /> Stellar</span>
				</a>

				<nav aria-label="Primary navigation">
					<a href="#infrastructure">Infrastructure</a>
					<a href="#proof">Proof</a>
					<a href={architectureUrl} rel="noreferrer" target="_blank">Architecture</a>
				</nav>

				<a className="header-connect" href="https://grindy.fun/profile" rel="noreferrer" target="_blank">
					Let&apos;s grind <ArrowIcon />
				</a>
			</header>

			<section className="hero" id="top">
				<div className="hero-grid" aria-hidden="true" />
				<div className="hero-glow hero-glow-one" aria-hidden="true" />
				<div className="hero-glow hero-glow-two" aria-hidden="true" />

				<div className="hero-copy">
					<div className="network-pill"><span className="online-dot" />Stellar Soroban testnet</div>
					<h1>Campaign growth,<span>now Stellar-native.</span></h1>
					<p className="hero-lede">
						Grindy turns verifiable wallet activity into measurable protocol campaigns: identity, scoring, leaderboards, and a transparent reward-settlement path.
					</p>
					<div className="hero-actions">
						<button className="button button-primary" onClick={startDemo} type="button"><WalletIcon /> Try the live demo</button>
						<a className="button button-secondary" href={architectureUrl} rel="noreferrer" target="_blank"><DocsIcon /> Read the architecture</a>
					</div>
					<div className="hero-meta"><span>No trading custody</span><span>Open-source integration</span><span>Public testnet evidence</span></div>
				</div>

				<div className="hero-art" aria-label="Grindy mascot connected to Stellar campaign infrastructure">
					<div className="orbit orbit-one" />
					<div className="orbit orbit-two" />
					<div className="stellar-core"><StellarMark /></div>
					<Image alt="Grindy pink monkey mascot" className="mascot" height={760} priority src="/brand/grindy-monkey.png" width={760} />
					<div className="floating-card floating-card-top"><span>Wallet proof</span><strong>Signature verified</strong></div>
					<div className="floating-card floating-card-bottom"><span>Reward vault</span><strong>Live on testnet</strong></div>
				</div>
			</section>

			<section className="evidence-strip" id="proof">
				<div><span>Network</span><strong>Stellar testnet</strong></div>
				<div><span>Contract</span><a href={contractUrl} rel="noreferrer" target="_blank">{shorten(vaultContractId)}</a></div>
				<div><span>WASM hash</span><strong>8ef2c8f8...29b5bc2d</strong></div>
				<div><span>Source</span><a href={githubUrl} rel="noreferrer" target="_blank">GitHub public repo ↗</a></div>
			</section>

			<section className="section infrastructure" id="infrastructure">
				<div className="section-heading">
					<p className="eyebrow">Stellar integration layer</p>
					<h2>From wallet activity to protocol growth.</h2>
					<p>The public repository exposes the Stellar-specific components. The existing Grindy engine remains responsible for campaign operations, scoring, leaderboards, and analytics.</p>
				</div>

				<div className="capability-grid">
					{capabilities.map((capability) => (
						<article className="capability-card" key={capability.title}>
							<div className="capability-topline"><CapabilityIcon name={capability.icon} /><span>{capability.index}</span></div>
							<h3>{capability.title}</h3>
							<p>{capability.text}</p>
						</article>
					))}
				</div>
			</section>

			<section className="section flow-section">
				<div className="flow-copy">
					<p className="eyebrow">Campaign data flow</p>
					<h2>Stellar is the identity, data, and settlement rail.</h2>
					<p>Every protocol-specific action is normalized before it reaches the campaign engine. That keeps scoring deterministic and lets new Stellar protocol adapters share one integration boundary.</p>
					<a className="text-link" href={architectureUrl} rel="noreferrer" target="_blank">Explore the complete C4 architecture <ArrowIcon /></a>
				</div>
				<div className="flow-map" aria-label="Stellar campaign data flow diagram">
					<FlowNode label="Participant" meta="Freighter wallet" tone="pink" /><FlowArrow />
					<FlowNode label="Stellar activity" meta="RPC · Horizon · events" tone="stellar" /><FlowArrow />
					<FlowNode label="Grindy engine" meta="Rules · score · rank" tone="violet" /><FlowArrow />
					<FlowNode label="Soroban vault" meta="Deposit · withdraw · prove" tone="cyan" />
				</div>
			</section>

			<section className="section lab-section" id="lab">
				<div className="lab-heading">
					<div><p className="eyebrow">Interactive testnet lab</p><h2>Verify the integration yourself.</h2></div>
					<div className="lab-tabs" role="tablist" aria-label="Demo mode">
						<button aria-selected={labView === "identity"} className={labView === "identity" ? "active" : ""} onClick={() => setLabView("identity")} role="tab" type="button">Wallet identity</button>
						<button aria-selected={labView === "vault"} className={labView === "vault" ? "active" : ""} onClick={() => setLabView("vault")} role="tab" type="button">Reward vault</button>
					</div>
				</div>

				<div className="lab-shell">
					<aside className="lab-sidebar">
						<div className="lab-network"><span className="online-dot" /> {isTestnetWallet ? "Testnet connected" : "Testnet required"}</div>
						<div className="wallet-summary"><span>Active wallet</span><strong>{wallet ? shorten(wallet.publicKey) : "Not connected"}</strong><small>{wallet?.network ?? "Freighter required"}</small></div>
						<button className="button button-primary sidebar-button" onClick={connect} type="button"><WalletIcon /> {wallet ? "Reconnect" : "Connect Freighter"}</button>
						<div className="contract-mini"><span>CampaignRewardVault</span><a href={contractUrl} rel="noreferrer" target="_blank">{shorten(vaultContractId)} ↗</a></div>
					</aside>

					<div className="lab-workspace">
						{labView === "identity" ? (
							<div className="demo-panel">
								<div className="demo-step"><span>01</span><div><h3>Connect and prove wallet ownership</h3><p>The message authorizes profile linking only. It cannot move assets.</p></div></div>
								<div className="message-preview"><span>Ownership challenge</span><code>{wallet ? `grindy.fun · ${shorten(wallet.publicKey)} · nonce generated at signature time` : "Connect Freighter to generate a unique challenge."}</code></div>
								<button className="button button-pink" disabled={!wallet} onClick={signOwnershipProof} type="button"><SignatureIcon /> Sign ownership proof</button>
								{proof ? <div className={`result-card ${proofValid ? "success" : "failure"}`}><strong>{proofValid ? "Signature verified" : "Verification failed"}</strong><span>{shorten(proof.signature)}</span></div> : null}
							</div>
						) : (
							<div className="demo-panel">
								<div className="demo-step"><span>02</span><div><h3>Execute a Soroban vault action</h3><p>Deposit or withdraw native XLM through the deployed testnet contract.</p></div></div>
								<label className="amount-label" htmlFor="amount">Amount in XLM</label>
								<div className="amount-control"><input id="amount" inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} /><span>XLM</span></div>
								<div className="vault-actions">
									<button className="button button-primary" disabled={!readyForTx || pendingAction !== null} onClick={() => submit("deposit")} type="button">{pendingAction === "deposit" ? "Preparing..." : "Deposit to vault"}</button>
									<button className="button button-secondary" disabled={!readyForTx || pendingAction !== null} onClick={() => submit("withdraw")} type="button">{pendingAction === "withdraw" ? "Preparing..." : "Withdraw"}</button>
								</div>
								{txHash ? <a className="result-card success result-link" href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} rel="noreferrer" target="_blank"><strong>Transaction submitted</strong><span>Open on Stellar Expert ↗</span></a> : null}
							</div>
						)}

						{status ? <div className="global-status">{status}</div> : null}
						{error ? <div className="global-status error-status">{error}</div> : null}
					</div>
				</div>
			</section>

			<footer>
				<div className="footer-brand"><Image alt="Grindy G" height={38} src="/brand/grindy-g-transparent.png" width={40} /><div><strong>Grindy x Stellar</strong><span>Open-source integration demo</span></div></div>
				<div className="footer-links"><a href={githubUrl} rel="noreferrer" target="_blank">GitHub</a><a href={architectureUrl} rel="noreferrer" target="_blank">Architecture</a><a href={contractUrl} rel="noreferrer" target="_blank">Stellar Expert</a><a href="https://grindy.fun" rel="noreferrer" target="_blank">Grindy.fun</a></div>
				<div className="footer-network"><span className="online-dot" /> Powered by Stellar testnet</div>
			</footer>

			{demoGuideOpen ? (
				<div className="modal-backdrop" onMouseDown={() => setDemoGuideOpen(false)}>
					<section
						aria-labelledby="wallet-guide-title"
						aria-modal="true"
						className="wallet-guide"
						onMouseDown={(event) => event.stopPropagation()}
						role="dialog"
					>
						<button aria-label="Close wallet guide" className="modal-close" onClick={() => setDemoGuideOpen(false)} type="button">×</button>
						<div className="guide-icon"><WalletIcon /></div>
						<p className="eyebrow">Choose your demo path</p>
						<h2 id="wallet-guide-title">Freighter was not detected.</h2>
						<p className="guide-copy">
							The public on-chain demo uses Freighter on Stellar testnet to sign an ownership proof and vault transaction. Grindy never asks for your seed phrase.
						</p>
						<div className="guide-options">
							<a className="guide-option freighter-option" href="https://freighter.app/" rel="noreferrer" target="_blank">
								<span>Test on Stellar</span><strong>Install Freighter</strong><small>Switch the wallet network to Testnet, then return here.</small>
							</a>
							<a className="guide-option grindy-option" href="https://grindy.fun/profile" rel="noreferrer" target="_blank">
								<span>Explore the live product</span><strong>Open your Grindy profile</strong><small>See the production profile and wallet onboarding experience.</small>
							</a>
						</div>
						<button className="guide-skip" onClick={() => { setDemoGuideOpen(false); openLab("identity"); }} type="button">
							Explore the public lab without connecting <ArrowIcon />
						</button>
					</section>
				</div>
			) : null}
		</main>
	);
}

function FlowNode({ label, meta, tone }: { label: string; meta: string; tone: string }) {
	return <div className={`flow-node ${tone}`}><span>{label}</span><strong>{meta}</strong></div>;
}

function FlowArrow() {
	return <div className="flow-arrow" aria-hidden="true"><span /><ArrowIcon /></div>;
}

function shorten(value: string) {
	if (!value) return "not configured";
	if (value.length <= 20) return value;
	return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function StellarMark() {
	return <svg aria-hidden="true" className="stellar-mark" viewBox="0 0 32 32"><circle cx="16" cy="16" fill="none" r="10" stroke="currentColor" strokeWidth="2.4" /><path d="M5 21.5 27 10.5M5 16.5 27 5.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" /></svg>;
}

function CapabilityIcon({ name }: { name: string }) {
	if (name === "identity") return <WalletIcon />;
	if (name === "activity") return <ActivityIcon />;
	if (name === "score") return <ScoreIcon />;
	return <SettlementIcon />;
}

function WalletIcon() {
	return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7.5h14a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12v4.5M16 13h4" /><circle cx="16" cy="13" r="1" /></svg>;
}

function DocsIcon() {
	return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z" /></svg>;
}

function SignatureIcon() {
	return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 17c4-5 5-9 7-9 3 0-1 8 2 8 2 0 2-4 4-4 1.5 0 1 3 3 3h2M3 21h18" /></svg>;
}

function ActivityIcon() {
	return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 12h4l2-7 4 14 2-7h6" /></svg>;
}

function ScoreIcon() {
	return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7" /></svg>;
}

function SettlementIcon() {
	return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2 4 6v5c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V6l-8-4Z" /><path d="m9 12 2 2 4-5" /></svg>;
}

function ArrowIcon() {
	return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
}
