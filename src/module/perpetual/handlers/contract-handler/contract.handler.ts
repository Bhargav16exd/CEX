import { CONTRACT_STORE, readContractStoreUserContractAvgPrice, readContractStoreUserContractCollateral, readContractStoreUserContractQuantity, removeUserIdFromCounterPartId, updateContractStoreUserContractAvgPrice, updateContractStoreUserContractCollateral, updateContractStoreUserContractCounterPartId, updateContractStoreUserContractQuantity } from "../memory/contracts/contracts-store.js";


const MARKET_PRICE = 100;

export const hanldeContracts = (stockSymbol:string, contract_quantity:number, price:number, personWhoLongedId:string, personWhoShortedId:string, collateral:number) => {
	OrderLongSettleContracts(stockSymbol, contract_quantity, price, personWhoLongedId, personWhoShortedId, collateral);
	OrderShortSettleContracts(stockSymbol, contract_quantity, price, personWhoLongedId, personWhoShortedId, collateral);

	console.log("CONTRACT STORE", CONTRACT_STORE["11"]["sol"]);
}

const OrderLongSettleContracts = (stockSymbol:string, contract_quantity:number, price:number, personWhoLongedId:string, personWhoShortedId:string, collateral:number) => {

	//read values of the personWhoLonged
	const personWhoLongedContractQuantity = readContractStoreUserContractQuantity(personWhoLongedId, stockSymbol)
	const personWhoLongedAvgPrice = readContractStoreUserContractAvgPrice(personWhoLongedId, stockSymbol)
	const personWhoLongedCollateral = readContractStoreUserContractCollateral(personWhoLongedId, stockSymbol)

	if(personWhoLongedContractQuantity > 0 ){
		updateContractStoreUserContractQuantity(personWhoLongedId, stockSymbol, personWhoLongedContractQuantity + contract_quantity);
		updateContractStoreUserContractAvgPrice(personWhoLongedId, stockSymbol, ((personWhoLongedAvgPrice * personWhoLongedContractQuantity) + (price * contract_quantity)) / (personWhoLongedContractQuantity + contract_quantity));
		updateContractStoreUserContractCollateral(personWhoLongedId, stockSymbol, personWhoLongedCollateral + collateral);
		updateContractStoreUserContractCounterPartId(personWhoLongedId, stockSymbol, personWhoShortedId);
	}
	else if(personWhoLongedContractQuantity === 0){
		updateContractStoreUserContractQuantity(personWhoLongedId, stockSymbol, contract_quantity);
		updateContractStoreUserContractAvgPrice(personWhoLongedId, stockSymbol, price);
		updateContractStoreUserContractCollateral(personWhoLongedId, stockSymbol, collateral);
		updateContractStoreUserContractCounterPartId(personWhoLongedId, stockSymbol, personWhoShortedId);
	}
	else{

		if(personWhoLongedContractQuantity + contract_quantity < 0){
			updateContractStoreUserContractQuantity(personWhoLongedId, stockSymbol, personWhoLongedContractQuantity + contract_quantity);
			updateContractStoreUserContractAvgPrice(personWhoLongedId, stockSymbol, personWhoLongedAvgPrice);
			updateContractStoreUserContractCollateral(personWhoLongedId, stockSymbol, personWhoLongedCollateral + collateral);
		}
		else if(personWhoLongedContractQuantity + contract_quantity === 0){

			updateContractStoreUserContractQuantity(personWhoLongedId, stockSymbol, 0);
			updateContractStoreUserContractAvgPrice(personWhoLongedId, stockSymbol, 0);
			updateContractStoreUserContractCollateral(personWhoLongedId, stockSymbol, 0);
			removeUserIdFromCounterPartId(personWhoLongedId, stockSymbol, personWhoShortedId);
			//profits
		}
		else{
			const remainingContractQuantity = personWhoLongedContractQuantity + contract_quantity;
			const remainingCollateral = (personWhoLongedCollateral / personWhoLongedContractQuantity) * remainingContractQuantity;
			updateContractStoreUserContractQuantity(personWhoLongedId, stockSymbol, remainingContractQuantity);
			updateContractStoreUserContractAvgPrice(personWhoLongedId, stockSymbol, personWhoLongedAvgPrice);
			updateContractStoreUserContractCollateral(personWhoLongedId, stockSymbol, remainingCollateral);
			updateContractStoreUserContractCounterPartId(personWhoLongedId, stockSymbol, personWhoShortedId);
		}

	}

	console.log("CONTRACT STORE 1", CONTRACT_STORE);

}

const OrderShortSettleContracts = (stockSymbol:string, contract_quantity:number, price:number, personWhoLongedId:string, personWhoShortedId:string, collateral:number) => {

	//read values of the personWhoShorted
	const personWhoShortedContractQuantity = readContractStoreUserContractQuantity(personWhoShortedId, stockSymbol)
	const personWhoShortedAvgPrice = readContractStoreUserContractAvgPrice(personWhoShortedId, stockSymbol)
	const personWhoShortedCollateral = readContractStoreUserContractCollateral(personWhoShortedId, stockSymbol)

	if(personWhoShortedContractQuantity < 0 ){
		updateContractStoreUserContractQuantity(personWhoShortedId, stockSymbol, personWhoShortedContractQuantity - contract_quantity);
		updateContractStoreUserContractAvgPrice(personWhoShortedId, stockSymbol, ((personWhoShortedAvgPrice * Math.abs(personWhoShortedContractQuantity)) + (price * contract_quantity)) / (Math.abs(personWhoShortedContractQuantity) + contract_quantity));
		updateContractStoreUserContractCollateral(personWhoShortedId, stockSymbol, personWhoShortedCollateral + collateral);
		updateContractStoreUserContractCounterPartId(personWhoShortedId, stockSymbol, personWhoLongedId);
	}
	else if(personWhoShortedContractQuantity === 0){
		updateContractStoreUserContractQuantity(personWhoShortedId, stockSymbol, -contract_quantity);
		updateContractStoreUserContractAvgPrice(personWhoShortedId, stockSymbol, price);
		updateContractStoreUserContractCollateral(personWhoShortedId, stockSymbol, collateral);
		updateContractStoreUserContractCounterPartId(personWhoShortedId, stockSymbol, personWhoLongedId);
	}
	else{

		if(personWhoShortedContractQuantity - contract_quantity > 0){
			updateContractStoreUserContractQuantity(personWhoShortedId, stockSymbol, personWhoShortedContractQuantity - contract_quantity);
			updateContractStoreUserContractAvgPrice(personWhoShortedId, stockSymbol, personWhoShortedAvgPrice);
			updateContractStoreUserContractCollateral(personWhoShortedId, stockSymbol, personWhoShortedCollateral + collateral);
		}
		else if(personWhoShortedContractQuantity - contract_quantity === 0){
			console.log("user", personWhoShortedId)
			updateContractStoreUserContractQuantity(personWhoShortedId, stockSymbol, 0);
			updateContractStoreUserContractAvgPrice(personWhoShortedId, stockSymbol, 0);
			updateContractStoreUserContractCollateral(personWhoShortedId, stockSymbol, 0);

			//removeUserIdFromCounterPartId(personWhoShortedId, stockSymbol, personWhoLongedId);
		}
		else{
			const remainingContractQuantity = personWhoShortedContractQuantity - contract_quantity;
			const remainingCollateral = (personWhoShortedCollateral / Math.abs(personWhoShortedContractQuantity)) * Math.abs(remainingContractQuantity);
			updateContractStoreUserContractQuantity(personWhoShortedId, stockSymbol, remainingContractQuantity);
			updateContractStoreUserContractAvgPrice(personWhoShortedId, stockSymbol, personWhoShortedAvgPrice);
			updateContractStoreUserContractCollateral(personWhoShortedId, stockSymbol, remainingCollateral);

			updateContractStoreUserContractCounterPartId(personWhoShortedId, stockSymbol, personWhoLongedId);

		}

	}
}

