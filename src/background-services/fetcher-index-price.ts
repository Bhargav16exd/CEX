import { CONTRACT_STORE, updateBalanceStoreUserActiveContractUnrealizedPnL } from "../module/perpetual/contracts/contracts-store.js";

let INDEX_PRICE = 0;

export const listenIndexPrices = async () => {

  const ws = new WebSocket(
		"wss://dstream.binance.com/ws/solusd@indexPrice"
	);

	ws.onmessage = (event) => {
		const data = JSON.parse(event.data);
		INDEX_PRICE = data.p
		recalculatePnL();
	};
} 

const recalculatePnL = () => {
	Object.keys(CONTRACT_STORE!).forEach((userId)=>{
		//@ts-ignore
		const userMetaData = CONTRACT_STORE[userId]["sol"]!
		const PnL = ((Math.trunc(INDEX_PRICE) - userMetaData.avg_price) * userMetaData.contract_quantity);

		updateBalanceStoreUserActiveContractUnrealizedPnL(userId, "sol", PnL);
	})
}