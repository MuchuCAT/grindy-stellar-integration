import type { SoroswapRpcEvent } from "../../src/index";

/**
 * Public Stellar testnet event returned by getEvents for the Soroswap Router.
 * Transaction: 48dc831a8865641b1af97d817454afa0a1e4643f7fbc7bd058988ef42d4b3318
 */
export const soroswapSwapEventFixture: SoroswapRpcEvent = {
	type: "contract",
	ledger: 4_084_752,
	ledgerClosedAt: "2026-08-11T10:39:53Z",
	contractId: "CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD",
	id: "0017543876252295168-0000000004",
	operationIndex: 0,
	transactionIndex: 0,
	txHash: "48dc831a8865641b1af97d817454afa0a1e4643f7fbc7bd058988ef42d4b3318",
	inSuccessfulContractCall: true,
	topic: [
		"AAAADgAAAA5Tb3Jvc3dhcFJvdXRlcgAA",
		"AAAADwAAAARzd2Fw",
	],
	value:
		"AAAAEQAAAAEAAAADAAAADwAAAAdhbW91bnRzAAAAABAAAAABAAAAAgAAAAoAAAAAAAAAAAAAAAB3NZQAAAAACgAAAAAAAAAAAAAAAAwrflEAAAAPAAAABHBhdGgAAAAQAAAAAQAAAAIAAAASAAAAAdeSi3LCcDzP6vfrn/TvTVBKVai5efybRQ6iyEK00c5hAAAAEgAAAAFQRc1ewHKado/VrQJQWFLfTwKNzoMOWsUiCbpISDsvAQAAAA8AAAACdG8AAAAAABIAAAAAAAAAAPGkB9GSmLiVYHvEusTvGAuIr9X8sjy/kJHfvG7sNUcs",
};
