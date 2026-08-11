import Image from "next/image";
import Link from "next/link";
import { campaignProof, short } from "../../../data/testnet-campaign-001";
import styles from "./campaign-proof.module.css";

const sourceUrl =
	"https://github.com/MuchuCAT/grindy-stellar-integration/tree/main/adapters/soroswap";
const schemaUrl =
	"https://github.com/MuchuCAT/grindy-stellar-integration/blob/main/docs/event-schema.md";

export default function TestnetCampaignProof() {
	return (
		<main className={styles.page}>
			<header className={styles.header}>
				<Link className={styles.brand} href="/">
					<Image alt="Grindy G" height={46} priority src="/brand/grindy-g-transparent.png" width={50} />
					<span>Grindy</span><b>×</b><strong>Stellar</strong>
				</Link>
				<nav>
					<a href="#activity">Activity</a>
					<a href="#settlement">Settlement</a>
					<a href="#evidence">Evidence</a>
					<Link className={styles.back} href="/">Integration lab ↗</Link>
				</nav>
			</header>

			<section className={styles.hero}>
				<div className={styles.heroCopy}>
					<div className={styles.status}><i /> {campaignProof.network} · {campaignProof.status}</div>
					<p className={styles.eyebrow}>End-to-end public proof</p>
					<h1>Campaign #001.<br /><span>Activity became settlement.</span></h1>
					<p className={styles.lede}>A real Soroswap testnet swap was decoded, normalized, accepted as campaign contribution, ranked, finalized, committed on-chain and paid through Grindy Campaign Rails.</p>
					<div className={styles.heroActions}>
						<a className={styles.primaryButton} href={campaignProof.activity.transactionUrl} rel="noreferrer" target="_blank">Open source activity ↗</a>
						<a className={styles.secondaryButton} href={campaignProof.contracts.escrow.url} rel="noreferrer" target="_blank">Inspect escrow ↗</a>
					</div>
				</div>
				<div className={styles.heroProof}>
					<div className={styles.orbit} aria-hidden="true" />
					<Image alt="Grindy campaign mascot" className={styles.mascot} height={480} priority src="/brand/grindy-monkey.png" width={480} />
					<div className={`${styles.signal} ${styles.signalOne}`}><span>Source</span><strong>Soroswap swap</strong></div>
					<div className={`${styles.signal} ${styles.signalTwo}`}><span>Result</span><strong>70 XLM paid</strong></div>
				</div>
			</section>

			<section className={styles.metrics} aria-label="Campaign metrics">
				<Metric label="Wallets" value="1" />
				<Metric label="Eligible activity" value="200 XLM" />
				<Metric label="Reward pool" value={campaignProof.allocation.rewardPool} />
				<Metric label="Distributed" value={campaignProof.allocation.allocated} />
				<Metric label="State" value={campaignProof.status} />
			</section>

			<section className={styles.section} id="activity">
				<div className={styles.sectionHeading}>
					<p className={styles.eyebrow}>Attribution layer</p>
					<h2>One public action. One deterministic campaign event.</h2>
					<p>The adapter consumes Stellar RPC event XDR, validates the Soroswap router event and produces the stable event shape consumed by the campaign engine.</p>
				</div>
				<div className={styles.activityGrid}>
					<article className={styles.activityCard}>
						<div className={styles.cardTop}><span>01 · Stellar activity</span><a href={campaignProof.activity.transactionUrl} rel="noreferrer" target="_blank">Transaction ↗</a></div>
						<h3>{campaignProof.activity.input} swapped</h3>
						<dl>
							<Row label="Protocol" value={campaignProof.protocol} />
							<Row label="Ledger" value={campaignProof.activity.ledger.toLocaleString("en-US")} />
							<Row label="Wallet" value={short(campaignProof.activity.wallet)} mono />
							<Row label="Transaction" value={short(campaignProof.activity.transactionHash)} mono />
						</dl>
					</article>
					<div className={styles.pipe}><span>Decoded</span><i>→</i><span>Validated</span></div>
					<article className={`${styles.activityCard} ${styles.normalizedCard}`}>
						<div className={styles.cardTop}><span>02 · Normalized event</span><a href={schemaUrl} rel="noreferrer" target="_blank">Schema ↗</a></div>
						<div className={styles.eligible}><i /> eligible_event = true</div>
						<pre>{JSON.stringify(campaignProof.normalizedEvent, null, 2)}</pre>
					</article>
				</div>
				<div className={styles.sourceLine}>Public adapter implementation <a href={sourceUrl} rel="noreferrer" target="_blank">Soroswap adapter source and fixture tests ↗</a></div>
			</section>

			<section className={`${styles.section} ${styles.settlementSection}`} id="settlement">
				<div className={styles.sectionHeading}>
					<p className={styles.eyebrow}>Scoring and settlement</p>
					<h2>The contract settles the result. It never decides the score.</h2>
					<p>Grindy freezes the leaderboard and creates the allocation manifest. Soroban commits that result, prevents duplicate payouts and moves only the protocol-funded reward pool.</p>
				</div>
				<div className={styles.settlementGrid}>
					<article className={styles.leaderboard}>
						<div className={styles.cardTop}><span>Final leaderboard</span><strong>1 participant</strong></div>
						{campaignProof.leaderboard.map((entry) => (
							<div className={styles.leaderRow} key={entry.wallet}>
								<b>#{entry.rank}</b>
								<div><strong>{short(entry.wallet)}</strong><span>{entry.contribution}</span></div>
								<div><strong>{entry.reward}</strong><span className={styles.paid}>{entry.status}</span></div>
							</div>
						))}
					</article>
					<article className={styles.allocationCard}>
						<div className={styles.cardTop}><span>Allocation manifest</span><strong>{campaignProof.allocation.mode}</strong></div>
						<div className={styles.allocationNumbers}>
							<div><span>Funded</span><strong>{campaignProof.allocation.rewardPool}</strong></div>
							<div><span>Paid</span><strong>{campaignProof.allocation.allocated}</strong></div>
							<div><span>Returned</span><strong>{campaignProof.allocation.unusedReturned}</strong></div>
						</div>
						<code>{campaignProof.allocation.root}</code>
					</article>
				</div>
				<p className={styles.honestyNote}>This proof paid the attributed activity wallet through the contract&apos;s verified batch path. Participant self-claim is implemented and covered by contract tests, but was not used because the public Soroswap wallet is not controlled by Grindy.</p>
			</section>

			<section className={styles.section} id="evidence">
				<div className={styles.sectionHeading}>
					<p className={styles.eyebrow}>On-chain evidence</p>
					<h2>Every accepted state transition is public.</h2>
				</div>
				<div className={styles.contractGrid}>
					{Object.values(campaignProof.contracts).map((contract) => (
						<a className={styles.contractCard} href={contract.url} key={contract.id} rel="noreferrer" target="_blank">
							<span>{contract.label}</span><strong>{short(contract.id)}</strong><small>Open contract on Stellar Expert ↗</small>
						</a>
					))}
				</div>
				<div className={styles.timeline}>
					{campaignProof.lifecycle.map((event, index) => (
						<a className={styles.timelineItem} href={event.url} key={event.hash} rel="noreferrer" target="_blank">
							<b>{String(index + 1).padStart(2, "0")}</b><div><strong>{event.label}</strong><span>{event.meta}</span></div><code>{short(event.hash, 6, 6)}</code>
						</a>
					))}
				</div>
				<div className={styles.refundProof}>
					<div><p className={styles.eyebrow}>Alternative lifecycle proof</p><h3>Pause and refund were exercised on an isolated campaign.</h3><p>A separate escrow instance proves the emergency path without altering Campaign #001&apos;s settled state.</p></div>
					<div className={styles.refundLinks}><a href={campaignProof.refundProof.pauseUrl} rel="noreferrer" target="_blank">Pause transaction ↗</a><a href={campaignProof.refundProof.refundUrl} rel="noreferrer" target="_blank">Refund transaction ↗</a></div>
				</div>
			</section>

			<footer className={styles.footer}>
				<div><Image alt="Grindy G" height={34} src="/brand/grindy-g-transparent.png" width={38} /><strong>Grindy Campaign Rails</strong></div>
				<p>Public testnet readiness proof. This is technical evidence, not commercial traction.</p>
				<div><Link href="/">Integration lab</Link><a href="https://github.com/MuchuCAT/grindy-stellar-integration" rel="noreferrer" target="_blank">GitHub</a></div>
			</footer>
		</main>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return <div><span>{label}</span><strong>{value}</strong></div>;
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
	return <div><dt>{label}</dt><dd className={mono ? styles.mono : undefined}>{value}</dd></div>;
}
