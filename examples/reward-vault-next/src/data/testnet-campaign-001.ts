const explorer = "https://stellar.expert/explorer/testnet";

export const campaignProof = {
	name: "Grindy Stellar Testnet Campaign #001",
	slug: "grindy-stellar-testnet-campaign-001",
	campaignHash:
		"80185e7922159506f39b5c39bb028f7d55d511938d408d8c8e913bbacbf80dc5",
	network: "Stellar testnet",
	status: "Settled",
	protocol: "Soroswap",
	contracts: {
		escrow: {
			label: "CampaignEscrow",
			id: "CDTZ7IWFMOLUIPBNWF2H4MMA4JBAYVWKVQC4IISSIZNJLUYYZHJABCLP",
			url: `${explorer}/contract/CDTZ7IWFMOLUIPBNWF2H4MMA4JBAYVWKVQC4IISSIZNJLUYYZHJABCLP`,
		},
		distributor: {
			label: "RewardDistributor",
			id: "CB4BMKLNTZXUIIAAXULVNDZNYATKEVKHS7XJRABIS654B3LIVZAXT37M",
			url: `${explorer}/contract/CB4BMKLNTZXUIIAAXULVNDZNYATKEVKHS7XJRABIS654B3LIVZAXT37M`,
		},
	},
	activity: {
		wallet: "GDY2IB6RSKMLRFLAPPCLVRHPDAFYRL6V7SZDZP4QSHP3Y3XMGVDSYDN2",
		transactionHash:
			"48dc831a8865641b1af97d817454afa0a1e4643f7fbc7bd058988ef42d4b3318",
		transactionUrl: `${explorer}/tx/48dc831a8865641b1af97d817454afa0a1e4643f7fbc7bd058988ef42d4b3318`,
		ledger: 4_084_752,
		timestamp: "2026-08-11T10:39:53Z",
		input: "200 XLM",
		output: "20.4176977 token units",
		eventId: "0017543876252295168-0000000004",
	},
	normalizedEvent: {
		schemaVersion: "1.0",
		campaignId: "grindy-stellar-testnet-campaign-001",
		network: "testnet",
		wallet: "GDY2IB6RSKMLRFLAPPCLVRHPDAFYRL6V7SZDZP4QSHP3Y3XMGVDSYDN2",
		protocol: "soroswap",
		action: "swap",
		asset: "XLM",
		amount: "200",
		ledger: 4_084_752,
		transactionHash:
			"48dc831a8865641b1af97d817454afa0a1e4643f7fbc7bd058988ef42d4b3318",
		timestamp: "2026-08-11T10:39:53Z",
		eligible: true,
		contribution: "200 XLM eligible volume",
	},
	allocation: {
		rewardPool: "100 XLM",
		allocated: "70 XLM",
		unusedReturned: "30 XLM",
		participantCount: 1,
		root: "27f185b31c6c785856541b5222efc76d4ea188a802b22b7a85a0c776709f11db",
		mode: "Verified batch distribution",
	},
	leaderboard: [
		{
			rank: 1,
			wallet: "GDY2IB6RSKMLRFLAPPCLVRHPDAFYRL6V7SZDZP4QSHP3Y3XMGVDSYDN2",
			contribution: "200 XLM eligible volume",
			reward: "70 XLM",
			status: "Paid",
		},
	],
	lifecycle: [
		{
			label: "Escrow deployed",
			meta: "CampaignEscrow instance",
			hash: "764cb97a9ae9813e0564df5c493d255527e868a12a83c09a9fe3255e726cc01d",
		},
		{
			label: "Campaign initialized",
			meta: "Campaign ID and protocol roles stored",
			hash: "6a6438e6e3c5ed21bbeeaa0738a86205e0041509605054356a15de5e6e9c353f",
		},
		{
			label: "Reward pool funded",
			meta: "100 XLM deposited",
			hash: "57cc628ecd0c6bed3126b06b14befe47af683efac53728c466f1e7cc93623a96",
		},
		{
			label: "Campaign activated",
			meta: "Campaign entered its active state",
			hash: "2fbec7f7766184727f8277851d1948c030cc7579b169852dcdffdd32813cb3f4",
		},
		{
			label: "Leaderboard finalized",
			meta: "Allocation hash and participant count committed",
			hash: "8cfe41256d43cf9e6c33b876c24b574e29a9eaff0458e4a01ae6deee79ae2124",
		},
		{
			label: "Escrow settled",
			meta: "70 XLM routed; 30 XLM returned",
			hash: "9eb29891c17575abc4ac1178175b1ccf8f2d13c5fbf7c81780601efa73b0bcea",
		},
		{
			label: "Allocation committed",
			meta: "Merkle root committed once",
			hash: "a827bfa7431f1b3fcb7d4c88ebcbec86cfcee636e5ad9c924f5e21e97b39cd83",
		},
		{
			label: "Participant paid",
			meta: "70 XLM distributed to the activity wallet",
			hash: "b175e9ec332a9f02538411c2d6022a77aa27da7db4276451047511c418c9ca7e",
		},
	].map((item) => ({ ...item, url: `${explorer}/tx/${item.hash}` })),
	refundProof: {
		contractId: "CDHF24VRHBKAJLAQKI3EK4FT2EP4OMLAER7YLYDTZKR6KTQQN6XEYRAU",
		contractUrl: `${explorer}/contract/CDHF24VRHBKAJLAQKI3EK4FT2EP4OMLAER7YLYDTZKR6KTQQN6XEYRAU`,
		pauseHash:
			"3bcd30f7317cbc69c52d39ccb6b4635bbf268830d6b16aedd0396a5402d8bece",
		pauseUrl: `${explorer}/tx/3bcd30f7317cbc69c52d39ccb6b4635bbf268830d6b16aedd0396a5402d8bece`,
		refundHash:
			"0a273288d45b153d29acca6b05ab5d35a4d1a9eff94ca325732512780087ba63",
		refundUrl: `${explorer}/tx/0a273288d45b153d29acca6b05ab5d35a4d1a9eff94ca325732512780087ba63`,
	},
} as const;

export function short(value: string, left = 8, right = 8) {
	return `${value.slice(0, left)}...${value.slice(-right)}`;
}
