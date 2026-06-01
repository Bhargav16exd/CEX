// import { CONTRACT_STORE, updateContractStoreUserContractUnrealizedPnL } from "../../../perpetual-engine/src/memory/contracts/contracts-store.js";

// let INDEX_PRICE = 85;

// export const listenIndexPrices = async () => {

//   const ws = new WebSocket(
// 		"wss://dstream.binance.com/ws/solusd@indexPrice"
// 	);

// 	ws.onmessage = (event) => {
// 		const data = JSON.parse(event.data);
// 		INDEX_PRICE = data.p
// 		recalculatePnL();
// 	};
// } 

// const recalculatePnL = () => {
// 	Object.keys(CONTRACT_STORE!).forEach((userId)=>{
// 		//@ts-ignore
// 		const userMetaData = CONTRACT_STORE[userId]["sol"]!

//     if(!userMetaData){
//       return
//     };

//     let PnL = 0;

//     if(userMetaData.contract_quantity > 0){
//       PnL = (Math.trunc(INDEX_PRICE) - userMetaData.avg_price) * Math.abs(userMetaData.contract_quantity);
//     }
//     else if(userMetaData.contract_quantity < 0){
//       PnL = (userMetaData.avg_price  - Math.trunc(INDEX_PRICE)) * Math.abs(userMetaData.contract_quantity);
//     }
		
// 		updateContractStoreUserContractUnrealizedPnL(userId, "sol", PnL);
// 	})
// }