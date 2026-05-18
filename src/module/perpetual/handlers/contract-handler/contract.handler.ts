import { readBalanceStoreUserLockedBalance, readBalanceStoreUserTotalBalance, updateBalanceStoreUserLockedBalance, updateBalanceStoreUserTotalBalance } from "../../memory/balances/perp-balances.js";
import { CONTRACT_STORE, readContractStoreUserContractAvgPrice, readContractStoreUserContractCollateral, readContractStoreUserContractCounterPartId, readContractStoreUserContractQuantity, readContractStoreUserContractUnrealizedPnL, removeUserIdFromCounterPartId, updateContractStoreUserContractAvgPrice, updateContractStoreUserContractCollateral, updateContractStoreUserContractCounterPartId, updateContractStoreUserContractQuantity } from "../../memory/contracts/contracts-store.js";

const MARKET_PRICE = 100;

export const hanldeContracts = (stockSymbol:string, contract_quantity:number, price:number, personWhoLongedId:string, personWhoShortedId:string, reduceOnly:boolean) => {

  const collateral = contract_quantity * price ;

  const isLongOpenedToCloseContract = checkIsLongOrderClosingContract(stockSymbol, contract_quantity, price, personWhoLongedId, personWhoShortedId);
  const isShortOpenedToCloseContract = checkIsShortOrderClosingContract(stockSymbol, contract_quantity, price, personWhoLongedId, personWhoShortedId);

	const orderLongResposne = OrderLongSettleContracts(stockSymbol, contract_quantity, price, personWhoLongedId, personWhoShortedId, collateral);
	const orderShortReponse = OrderShortSettleContracts(stockSymbol, contract_quantity, price, personWhoLongedId, personWhoShortedId, collateral);

  console.log("is longed open to close contract",isLongOpenedToCloseContract)
  console.log("is short open to close contract",isShortOpenedToCloseContract)

  if(isLongOpenedToCloseContract && orderLongResposne.referenceIds.length > 0 ){
    //udpate short referece Ids
    removeUserIdFromCounterPartId(personWhoShortedId, stockSymbol, personWhoLongedId)

    orderLongResposne.referenceIds.forEach((userId)=>{
      //update previous references IDs
      updateContractStoreUserContractCounterPartId(personWhoShortedId, stockSymbol, userId);
    })

    delete CONTRACT_STORE[personWhoLongedId]![stockSymbol]
  }

  if(isShortOpenedToCloseContract && orderShortReponse.referenceIds.length > 0 ){
    //udpate short referece Ids
    removeUserIdFromCounterPartId(personWhoLongedId, stockSymbol, personWhoShortedId)

    orderShortReponse.referenceIds.forEach((userId)=>{
      //update previous references IDs
      updateContractStoreUserContractCounterPartId(personWhoLongedId, stockSymbol, userId);
    })
    
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

      console.log("hi2", personWhoShortedId, personWhoLongedId)

      //implies a condition where earlier person has longed and now the person has short to close the contract

      const personWhoShortedEarlierId = personWhoLongedId;
      const personWhoShortedEarlierPnL= readContractStoreUserContractUnrealizedPnL(personWhoLongedId, stockSymbol);
      const personWhoShortedEarlierCollateral = readContractStoreUserContractCollateral(personWhoLongedId, stockSymbol);

      const associatedPeopleWhoLongedInContract = readContractStoreUserContractCounterPartId(personWhoLongedId, stockSymbol)!;;

      console.log("person who shorted earlier pnl",personWhoShortedEarlierPnL)

      if(personWhoShortedEarlierPnL > 0){

        associatedPeopleWhoLongedInContract.forEach((personWhoLongedEarlierId)=>{

          removeUserIdFromCounterPartId(personWhoLongedEarlierId, stockSymbol, personWhoLongedId)

          //update previous references IDs
          updateContractStoreUserContractCounterPartId(personWhoLongedEarlierId, stockSymbol, personWhoShortedId);

          const personWhoLongedEarlierPnL = readContractStoreUserContractUnrealizedPnL(personWhoLongedEarlierId, stockSymbol);
          const personWhoLongedEarlierCollateral = readContractStoreUserContractCollateral(personWhoLongedEarlierId, stockSymbol);

          contractsHelper(personWhoShortedEarlierId ,personWhoShortedEarlierId, stockSymbol, 
            personWhoShortedEarlierPnL, personWhoLongedEarlierPnL, personWhoShortedEarlierCollateral, personWhoLongedEarlierCollateral);
        })
      }

      return {
        referenceIds:associatedPeopleWhoLongedInContract
      }

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

      //implies a condition where earlier person has longed and now the person has short to close the contrac

      console.log("hi", personWhoShortedId, personWhoLongedId)

      const personWhoLongedEarlierId = personWhoShortedId;
      const personWhoLongedEarlierPnL= readContractStoreUserContractUnrealizedPnL(personWhoShortedId, stockSymbol);
      const personWhoLongedEarlierCollateral = readContractStoreUserContractCollateral(personWhoShortedId, stockSymbol);

      const associatedPeopleWhoShortedInContract = readContractStoreUserContractCounterPartId(personWhoShortedId, stockSymbol)!;;

      if(personWhoLongedEarlierPnL > 0){
        associatedPeopleWhoShortedInContract.forEach((personWhoShortedEarlierId)=>{
          console.log("this ids",personWhoShortedEarlierId)
          removeUserIdFromCounterPartId(personWhoShortedEarlierId, stockSymbol, personWhoShortedId)
          updateContractStoreUserContractCounterPartId(personWhoShortedEarlierId, stockSymbol, personWhoLongedId);

          const personWhoShortedEarlierPnL= readContractStoreUserContractUnrealizedPnL(personWhoShortedEarlierId, stockSymbol);
          const personWhoShortedEarlierCollateral = readContractStoreUserContractCollateral(personWhoShortedEarlierId, stockSymbol);
          contractsHelper(personWhoLongedEarlierId , personWhoShortedEarlierId, stockSymbol, 
            personWhoLongedEarlierPnL, personWhoShortedEarlierPnL, personWhoLongedEarlierCollateral, personWhoShortedEarlierCollateral);
        })
      }

      return {
        referenceIds:associatedPeopleWhoShortedInContract
      }
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

const contractsHelper = (profitPersonId:string, lossPersonId:string, stockSymbol:string, 
  profitPersonPnl:number, lossPersonPnl:number, profitPersonCollateral:number, lossPersonCollateral:number) => {
   /*
    ------ SECTION 1 --------
    INFO : SECTION HANLDES PERSON WHO GAINS PROFIT IF LONGED 
    -> READ BALANCEES
    -> UPDATE BALANCES
    -> READ CONTRACTS
    -> UPDATE CONTRACT
    -> DELETE CONTRACT FOR STOCK_SYMBOL
    --------------------------
    */

    //read data of person who profited
    const userLongedTotalBalance = readBalanceStoreUserTotalBalance(profitPersonId);
    const userLongedLockedBalance = readBalanceStoreUserLockedBalance(profitPersonId);

    //update balances
    updateBalanceStoreUserTotalBalance(profitPersonId, userLongedTotalBalance + profitPersonPnl);
    updateBalanceStoreUserLockedBalance(profitPersonId, userLongedLockedBalance - profitPersonCollateral);

    /*
    ------ SECTION 2 --------
    INFO : SECTION HANLDES PERSON WHO GOT IF SHORTED
    -> READ BALANCEES
    -> UPDATE BALANCES
    -> READ CONTRACTS
    -> UPDATE CONTRACT
    -> DELETE CONTRACT FOR STOCK_SYMBOL
    --------------------------
    */

    //read data of longed
    const userShortedTotalBalance = readBalanceStoreUserTotalBalance(lossPersonId);
    const userShortedLockedBalance = readBalanceStoreUserLockedBalance(lossPersonId);

    //update balances
    updateBalanceStoreUserTotalBalance(lossPersonId, userShortedTotalBalance - lossPersonPnl);
    updateBalanceStoreUserLockedBalance(lossPersonId, userShortedLockedBalance - (lossPersonCollateral - lossPersonPnl));

}