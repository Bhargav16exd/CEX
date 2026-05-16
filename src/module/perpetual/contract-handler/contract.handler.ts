import { CONTRACT_STORE, readBalanceStoreUserActiveContractAvgPrice, readBalanceStoreUserActiveContractCollateral, readBalanceStoreUserActiveContractQuantity, updateBalanceStoreUserActiveContractAvgPrice, updateBalanceStoreUserActiveContractCollateral, updateBalanceStoreUserActiveContractQuantity } from "../contracts/contracts-store.js";

const MARKET_PRICE = 100;

export const hanldeContracts = (stockSymbol:string, contract_quantity:number, price:number, personWhoLongedId:string, personWhoShortedId:string, collateral:number) => {
	OrderLongSettleContracts(stockSymbol, contract_quantity, price, personWhoLongedId, collateral);
	OrderShortSettleContracts(stockSymbol, contract_quantity, price, personWhoShortedId, collateral);
}

const OrderLongSettleContracts = (stockSymbol:string, contract_quantity:number, price:number, personWhoLongedId:string, collateral:number) => {

	//read values of the personWhoLonged
	const personWhoLongedContractQuantity = readBalanceStoreUserActiveContractQuantity(personWhoLongedId, stockSymbol)
	const personWhoLongedAvgPrice = readBalanceStoreUserActiveContractAvgPrice(personWhoLongedId, stockSymbol)
	const personWhoLongedCollateral = readBalanceStoreUserActiveContractCollateral(personWhoLongedId, stockSymbol)

	if(personWhoLongedContractQuantity > 0 ){
		updateBalanceStoreUserActiveContractQuantity(personWhoLongedId, stockSymbol, personWhoLongedContractQuantity + contract_quantity);
		updateBalanceStoreUserActiveContractAvgPrice(personWhoLongedId, stockSymbol, ((personWhoLongedAvgPrice * personWhoLongedContractQuantity) + (price * contract_quantity)) / (personWhoLongedContractQuantity + contract_quantity));
		updateBalanceStoreUserActiveContractCollateral(personWhoLongedId, stockSymbol, personWhoLongedCollateral + collateral);
	}
	else if(personWhoLongedContractQuantity === 0){
		updateBalanceStoreUserActiveContractQuantity(personWhoLongedId, stockSymbol, contract_quantity);
		updateBalanceStoreUserActiveContractAvgPrice(personWhoLongedId, stockSymbol, price);
		updateBalanceStoreUserActiveContractCollateral(personWhoLongedId, stockSymbol, collateral);
	}
	else{

		if(personWhoLongedContractQuantity + contract_quantity < 0){
			updateBalanceStoreUserActiveContractQuantity(personWhoLongedId, stockSymbol, personWhoLongedContractQuantity + contract_quantity);
			updateBalanceStoreUserActiveContractAvgPrice(personWhoLongedId, stockSymbol, personWhoLongedAvgPrice);
			updateBalanceStoreUserActiveContractCollateral(personWhoLongedId, stockSymbol, personWhoLongedCollateral + collateral);
		}
		else if(personWhoLongedContractQuantity + contract_quantity === 0){

			updateBalanceStoreUserActiveContractQuantity(personWhoLongedId, stockSymbol, 0);
			updateBalanceStoreUserActiveContractAvgPrice(personWhoLongedId, stockSymbol, 0);
			updateBalanceStoreUserActiveContractCollateral(personWhoLongedId, stockSymbol, 0);

			//profits
			console.log("PROFIT" , (MARKET_PRICE-personWhoLongedAvgPrice)* personWhoLongedContractQuantity )
		}
		else{
			const remainingContractQuantity = personWhoLongedContractQuantity + contract_quantity;
			const remainingCollateral = (personWhoLongedCollateral / personWhoLongedContractQuantity) * remainingContractQuantity;
			updateBalanceStoreUserActiveContractQuantity(personWhoLongedId, stockSymbol, remainingContractQuantity);
			updateBalanceStoreUserActiveContractAvgPrice(personWhoLongedId, stockSymbol, personWhoLongedAvgPrice);
			updateBalanceStoreUserActiveContractCollateral(personWhoLongedId, stockSymbol, remainingCollateral);
		}

	}

}

const OrderShortSettleContracts = (stockSymbol:string, contract_quantity:number, price:number, personWhoShortedId:string, collateral:number) => {

	//read values of the personWhoShorted
	const personWhoShortedContractQuantity = readBalanceStoreUserActiveContractQuantity(personWhoShortedId, stockSymbol)
	const personWhoShortedAvgPrice = readBalanceStoreUserActiveContractAvgPrice(personWhoShortedId, stockSymbol)
	const personWhoShortedCollateral = readBalanceStoreUserActiveContractCollateral(personWhoShortedId, stockSymbol)

	if(personWhoShortedContractQuantity < 0 ){
		updateBalanceStoreUserActiveContractQuantity(personWhoShortedId, stockSymbol, personWhoShortedContractQuantity - contract_quantity);
		updateBalanceStoreUserActiveContractAvgPrice(personWhoShortedId, stockSymbol, ((personWhoShortedAvgPrice * Math.abs(personWhoShortedContractQuantity)) + (price * contract_quantity)) / (Math.abs(personWhoShortedContractQuantity) + contract_quantity));
		updateBalanceStoreUserActiveContractCollateral(personWhoShortedId, stockSymbol, personWhoShortedCollateral + collateral);
	}
	else if(personWhoShortedContractQuantity === 0){
		updateBalanceStoreUserActiveContractQuantity(personWhoShortedId, stockSymbol, -contract_quantity);
		updateBalanceStoreUserActiveContractAvgPrice(personWhoShortedId, stockSymbol, price);
		updateBalanceStoreUserActiveContractCollateral(personWhoShortedId, stockSymbol, collateral);
	}
	else{

		if(personWhoShortedContractQuantity - contract_quantity > 0){
			updateBalanceStoreUserActiveContractQuantity(personWhoShortedId, stockSymbol, personWhoShortedContractQuantity - contract_quantity);
			updateBalanceStoreUserActiveContractAvgPrice(personWhoShortedId, stockSymbol, personWhoShortedAvgPrice);
			updateBalanceStoreUserActiveContractCollateral(personWhoShortedId, stockSymbol, personWhoShortedCollateral + collateral);
		}
		else if(personWhoShortedContractQuantity - contract_quantity === 0){
			console.log("user", personWhoShortedId)
			updateBalanceStoreUserActiveContractQuantity(personWhoShortedId, stockSymbol, 0);
			updateBalanceStoreUserActiveContractAvgPrice(personWhoShortedId, stockSymbol, 0);
			updateBalanceStoreUserActiveContractCollateral(personWhoShortedId, stockSymbol, 0);

			//profits
			console.log("PROFIT" , (MARKET_PRICE-personWhoShortedAvgPrice)* personWhoShortedContractQuantity )
		}
		else{
			const remainingContractQuantity = personWhoShortedContractQuantity - contract_quantity;
			const remainingCollateral = (personWhoShortedCollateral / Math.abs(personWhoShortedContractQuantity)) * Math.abs(remainingContractQuantity);
			updateBalanceStoreUserActiveContractQuantity(personWhoShortedId, stockSymbol, remainingContractQuantity);
			updateBalanceStoreUserActiveContractAvgPrice(personWhoShortedId, stockSymbol, personWhoShortedAvgPrice);
			updateBalanceStoreUserActiveContractCollateral(personWhoShortedId, stockSymbol, remainingCollateral);
		}

	}
}

