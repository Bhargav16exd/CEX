import { userInfo } from "node:os";
import PERPETUAL_BALANCE_STORE, { readBalanceStoreUserLockedBalance, readBalanceStoreUserTotalBalance, updateBalanceStoreUserLockedBalance, updateBalanceStoreUserTotalBalance } from "../../memory/balances/perp-balances.js";
import { CONTRACT_STORE, readContractStoreUserContractAvgPrice, readContractStoreUserContractCollateral, readContractStoreUserContractCounterPartId, readContractStoreUserContractQuantity, readContractStoreUserContractUnrealizedPnL, removeUserIdFromCounterPartId, updateContractStoreUserContractAvgPrice, updateContractStoreUserContractCollateral, updateContractStoreUserContractCounterPartId, updateContractStoreUserContractQuantity } from "../../memory/contracts/contracts-store.js";

const MARKET_PRICE = 100;

export const hanldeContracts = (stockSymbol:string, contract_quantity:number, price:number, personWhoLongedId:string, personWhoShortedId:string) => {

  const collateral = contract_quantity * price ;

  const isLongClosingContract = checkIsLongOrderClosingContract(stockSymbol, contract_quantity, price, personWhoLongedId, personWhoShortedId);
  const isShortClosingContract = checkIsShortOrderClosingContract(stockSymbol, contract_quantity, price, personWhoLongedId, personWhoShortedId);
  

  if(isLongClosingContract === true){
    const personExitingLockedBalance = readBalanceStoreUserLockedBalance(personWhoLongedId);
    updateBalanceStoreUserLockedBalance(personWhoLongedId, personExitingLockedBalance - collateral);
  }
  else if(isShortClosingContract === true){
    const personExitingLockedBalance = readBalanceStoreUserLockedBalance(personWhoShortedId);
    updateBalanceStoreUserLockedBalance(personWhoShortedId, personExitingLockedBalance - collateral);
  }

  OrderLongSettleContracts(stockSymbol, contract_quantity, price, personWhoLongedId, personWhoShortedId, collateral);
	OrderShortSettleContracts(stockSymbol, contract_quantity, price, personWhoLongedId, personWhoShortedId, collateral);

  if(isLongClosingContract === true){
    delete CONTRACT_STORE[personWhoLongedId]![stockSymbol]
  }
  else if(isShortClosingContract === true){
    delete CONTRACT_STORE[personWhoShortedId]![stockSymbol]
  }
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

    return {
      referenceIds:[]
    }
	}
	else if(personWhoLongedContractQuantity === 0){
		updateContractStoreUserContractQuantity(personWhoLongedId, stockSymbol, contract_quantity);
		updateContractStoreUserContractAvgPrice(personWhoLongedId, stockSymbol, price);
		updateContractStoreUserContractCollateral(personWhoLongedId, stockSymbol, collateral);
		updateContractStoreUserContractCounterPartId(personWhoLongedId, stockSymbol, personWhoShortedId);

    return {
      referenceIds:[]
    }
	}
	else{

		if(personWhoLongedContractQuantity + contract_quantity < 0){
			updateContractStoreUserContractQuantity(personWhoLongedId, stockSymbol, personWhoLongedContractQuantity + contract_quantity);
			updateContractStoreUserContractAvgPrice(personWhoLongedId, stockSymbol, personWhoLongedAvgPrice);
			updateContractStoreUserContractCollateral(personWhoLongedId, stockSymbol, personWhoLongedCollateral + collateral);

      return {
       referenceIds:[]
      }

		}
		else if(personWhoLongedContractQuantity + contract_quantity === 0){
      //implies a condition where earlier person has shorted and now the person has longed to close the contract
      closeContract(stockSymbol, personWhoLongedId);
    }
		else{

      //implies a condition where earlier person has shorted and now the person has longed to close the contract
			const remainingContractQuantity = personWhoLongedContractQuantity + contract_quantity;
			const remainingCollateral = (personWhoLongedCollateral / personWhoLongedContractQuantity) * remainingContractQuantity;
			updateContractStoreUserContractQuantity(personWhoLongedId, stockSymbol, remainingContractQuantity);
			updateContractStoreUserContractAvgPrice(personWhoLongedId, stockSymbol, personWhoLongedAvgPrice);
			updateContractStoreUserContractCollateral(personWhoLongedId, stockSymbol, remainingCollateral);
			updateContractStoreUserContractCounterPartId(personWhoLongedId, stockSymbol, personWhoShortedId);

      return {
        referenceIds:[]
      }
		}

	}
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
    return {
      referenceIds:[]
    }
	}
	else if(personWhoShortedContractQuantity === 0){
		updateContractStoreUserContractQuantity(personWhoShortedId, stockSymbol, -contract_quantity);
		updateContractStoreUserContractAvgPrice(personWhoShortedId, stockSymbol, price);
		updateContractStoreUserContractCollateral(personWhoShortedId, stockSymbol, collateral);
		updateContractStoreUserContractCounterPartId(personWhoShortedId, stockSymbol, personWhoLongedId);
    return {
      referenceIds:[]
    }
	}
	else{

		if(personWhoShortedContractQuantity - contract_quantity > 0){
			updateContractStoreUserContractQuantity(personWhoShortedId, stockSymbol, personWhoShortedContractQuantity - contract_quantity);
			updateContractStoreUserContractAvgPrice(personWhoShortedId, stockSymbol, personWhoShortedAvgPrice);
			updateContractStoreUserContractCollateral(personWhoShortedId, stockSymbol, personWhoShortedCollateral + collateral);
      return {
        referenceIds:[]
      }
		}
		else if(personWhoShortedContractQuantity - contract_quantity === 0){

      //implies a condition where earlier person has longed and now the person has short to close the contract
      closeContract(stockSymbol, personWhoShortedId);
		}
		else{
      //implies a condition where earlier person has longed and now the person has short to close the contract

			const remainingContractQuantity = personWhoShortedContractQuantity - contract_quantity;
			const remainingCollateral = (personWhoShortedCollateral / Math.abs(personWhoShortedContractQuantity)) * Math.abs(remainingContractQuantity);
			updateContractStoreUserContractQuantity(personWhoShortedId, stockSymbol, remainingContractQuantity);
			updateContractStoreUserContractAvgPrice(personWhoShortedId, stockSymbol, personWhoShortedAvgPrice);
			updateContractStoreUserContractCollateral(personWhoShortedId, stockSymbol, remainingCollateral);

			updateContractStoreUserContractCounterPartId(personWhoShortedId, stockSymbol, personWhoLongedId);

      return {
        referenceIds:[]
      }
		}

	}
}

const checkIsLongOrderClosingContract = (stockSymbol:string, contract_quantity:number, price:number, personWhoLongedId:string, personWhoShortedId:string) => {
	const personWhoLongedContractQuantity = readContractStoreUserContractQuantity(personWhoLongedId, stockSymbol);

	if(personWhoLongedContractQuantity > 0 ){
    return false
	}
	else if(personWhoLongedContractQuantity === 0){
    return false
	}
	else{

		if(personWhoLongedContractQuantity + contract_quantity < 0){
      return false
		}
		else if(personWhoLongedContractQuantity + contract_quantity === 0){

      //implies a condition where earlier person has longed and now the person has short to close the contract
      return true
		}
		else{
      //implies a condition where earlier person has shorted and now the person has longed to close the contract
      return true
		}
  }
}

const checkIsShortOrderClosingContract = (stockSymbol:string, contract_quantity:number, price:number, personWhoLongedId:string, personWhoShortedId:string) => {
  //read values of the personWhoShorted
	const personWhoShortedContractQuantity = readContractStoreUserContractQuantity(personWhoShortedId, stockSymbol);

	if(personWhoShortedContractQuantity < 0 ){
		return false
	}
	else if(personWhoShortedContractQuantity === 0){
		return false
	}
	else{

		if(personWhoShortedContractQuantity - contract_quantity > 0){
			return false
		}
		else if(personWhoShortedContractQuantity - contract_quantity === 0){
      //implies a condition where earlier person has longed and now the person has short to close the contract
      return true
		}
		else{
      //implies a condition where earlier person has longed and now the person has short to close the contract
      return true
		}

	}
}

const closeContract = (stockSymbol:string, userId:string) => {

  const personExitingPnL = readContractStoreUserContractUnrealizedPnL(userId, stockSymbol);
  const personExitingCollateral = readContractStoreUserContractCollateral(userId, stockSymbol);

  const personExitingTotalBalance = readBalanceStoreUserTotalBalance(userId);
  const personExitingLockedBalance = readBalanceStoreUserLockedBalance(userId);

  if(personExitingPnL > 0){
    updateBalanceStoreUserTotalBalance(userId, personExitingTotalBalance + personExitingPnL);
    updateBalanceStoreUserLockedBalance(userId, personExitingLockedBalance - personExitingCollateral);
  }
  else if(personExitingPnL < 0){
    updateBalanceStoreUserTotalBalance(userId, personExitingTotalBalance + personExitingPnL);
    updateBalanceStoreUserLockedBalance(userId, personExitingLockedBalance - ( personExitingCollateral + personExitingPnL));
  }
}