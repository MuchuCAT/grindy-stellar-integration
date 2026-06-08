import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
	buildOwnershipMessage,
	connectWithFreighter,
	connectWithStellarWalletsKit,
	createNonce,
	signOwnershipMessageWithFreighter,
	signOwnershipMessageWithKit,
	type OwnershipSignature,
	type StellarWalletConnection,
} from "@grindy/stellar-wallet-link";
import { verifyStellarOwnershipSignature } from "@grindy/stellar-signature-verifier";
import "./styles.css";

const DEMO_USER_ID = "demo-grindy-user";

function App() {
	const [wallet, setWallet] = useState<StellarWalletConnection | null>(null);
	const [proof, setProof] = useState<OwnershipSignature | null>(null);
	const [verification, setVerification] = useState<boolean | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function connect(mode: "kit" | "freighter") {
		setLoading(true);
		setError(null);
		try {
			const connection =
				mode === "kit"
					? await connectWithStellarWalletsKit()
					: await connectWithFreighter();
			setWallet(connection);
			setProof(null);
			setVerification(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Wallet connection failed");
		} finally {
			setLoading(false);
		}
	}

	async function sign() {
		if (!wallet) return;
		setLoading(true);
		setError(null);
		try {
			const now = new Date();
			const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
			const input = {
				domain: window.location.host,
				userId: DEMO_USER_ID,
				publicKey: wallet.publicKey,
				nonce: createNonce(),
				issuedAt: now.toISOString(),
				expiresAt: expiresAt.toISOString(),
			};
			const signed =
				wallet.wallet === "freighter"
					? await signOwnershipMessageWithFreighter(
							input,
							wallet.networkPassphrase
						)
					: await signOwnershipMessageWithKit(input, wallet.networkPassphrase);

			setProof(signed);
			setVerification(
				verifyStellarOwnershipSignature({
					publicKey: signed.publicKey,
					message: signed.message,
					signature: signed.signature,
					signatureEncoding: signed.signatureEncoding,
				})
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Signing failed");
		} finally {
			setLoading(false);
		}
	}

	const previewMessage = wallet
		? buildOwnershipMessage({
				domain: typeof window !== "undefined" ? window.location.host : "localhost",
				userId: DEMO_USER_ID,
				publicKey: wallet.publicKey,
				nonce: "generated-at-sign-time",
			})
		: null;

	return (
		<main className="shell">
			<section className="hero">
				<p className="eyebrow">SCF Deliverable 1 Demo</p>
				<h1>Grindy Stellar Wallet Linking</h1>
				<p>
					Connect a Stellar wallet, sign an ownership message, and verify that
					the public key can be linked to an existing Grindy profile.
				</p>
			</section>

			<section className="card">
				<div className="step">
					<span>1</span>
					<div>
						<h2>Connect Stellar wallet</h2>
						<p>Only Stellar wallet options are shown in this demo.</p>
					</div>
				</div>
				<div className="actions">
					<button disabled={loading} onClick={() => connect("kit")} type="button">
						Connect with Stellar Wallets Kit
					</button>
					<button
						className="secondary"
						disabled={loading}
						onClick={() => connect("freighter")}
						type="button"
					>
						Connect Freighter
					</button>
				</div>
				{wallet ? (
					<div className="status success">
						<strong>Connected:</strong> {wallet.publicKey}
						<br />
						<small>
							Wallet: {wallet.wallet} · Network: {wallet.network ?? "unknown"}
						</small>
					</div>
				) : null}
			</section>

			<section className="card">
				<div className="step">
					<span>2</span>
					<div>
						<h2>Sign ownership message</h2>
						<p>The signature proves wallet ownership only. It cannot move funds.</p>
					</div>
				</div>
				<button disabled={loading || !wallet} onClick={sign} type="button">
					Sign ownership proof
				</button>
				{previewMessage ? <pre>{previewMessage}</pre> : null}
			</section>

			<section className="card">
				<div className="step">
					<span>3</span>
					<div>
						<h2>Verify and link profile</h2>
						<p>
							In production, the Grindy backend stores this wallet link
							after duplicate checks.
						</p>
					</div>
				</div>
				{proof ? (
					<div className={verification ? "status success" : "status error"}>
						<strong>Local verification:</strong>{" "}
						{verification ? "signature valid" : "signature invalid"}
						<br />
						<small>Signature preview: {proof.signature.slice(0, 24)}...</small>
					</div>
				) : (
					<div className="status">No ownership proof signed yet.</div>
				)}
			</section>

			{error ? <div className="status error">{error}</div> : null}
		</main>
	);
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>
);
