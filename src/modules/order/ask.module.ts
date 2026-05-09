import type { Request, Response } from "express"
import { ORDERBOOK_STORE } from "../../memory-store/orderbook/orderbook-store.js"
import BALANCE_STORE, { readBalanceStoreUserLockedStocks, readBalanceStoreUserTotalStocks, updateBalanceStoreUserLockedStocks, updateBalanceStoreUserTotalBalance, updateBalanceStoreUserTotalStocks } from "../../memory-store/balance/balance-store.js"
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js"
import { randomUUID } from "node:crypto"
import { OrderType } from "../../controllers/stock.controller.js"

export function hanldeOrderSideAsk(req:Request, res:Response , userId:string, stockSymbol:string, side:string, type:string, price:number, quantity:number){

	//if that stock doesnt exist in order book create an entry for that
	if(!ORDERBOOK_STORE[stockSymbol]){
		ORDERBOOK_STORE[stockSymbol] = {
			ask : {},
			bid: {}
		}
	}

	//userAvailableStocks - these are the stocks that can be used further
	const userAvailableStock = readBalanceStoreUserTotalStocks(userId, stockSymbol)! - readBalanceStoreUserLockedStocks(userId, stockSymbol)!

	if(!userAvailableStock){
		//tbd
		//user owned stocks are not found in memory 
		//refresh memory
		//retry and throw error
		return
	}

	//if user own quantity is less than order throw error
	if(quantity >= userAvailableStock){
		throw new HttpErrorResponse(400, false, "Insufficient Quantity");
	}

	if(!BALANCE_STORE[userId] || !BALANCE_STORE[userId].stock[stockSymbol]){
		return
	}


	if(type == OrderType.LIMIT){
		/*
			SCENARIO 1 - USER WANTS TO BUY BUT NO BID IS AVAILABLE
		  ACTION - WE PUT ASK IN ORDERBOOK
		*/

		//if bid for that price doesnt exist , sit in ask side of orderbook
		if(!ORDERBOOK_STORE[stockSymbol]?.bid[price]){			
			const result = actionCreateAsk(userId, stockSymbol, quantity ,price);
			return res.json(new HttpSuccessResponse(200, true, "Order Placed",ORDERBOOK_STORE[stockSymbol]));
		}

		/*
			SCENARIO 2 - USER WANTS TO BUY && BID IS AVAILABLE , depending on quantity available for sale we perform actions
		  ACTION - WE PUT BID IN ORDERBOOK OR DELETE WHOLE BID IF REQUIRED
		*/

		
		//if bid exist for that sale
		const bidInfo = ORDERBOOK_STORE[stockSymbol].bid[price]

		//complete fullfillment of ask order
		if(bidInfo.remainingQuantity == quantity){
			//tbd
			//delete both entries
			//add entry in db for fills
		}

		//complete fullfillment of ask order
		if(bidInfo.remainingQuantity > quantity){

			const previousTotalStocks =  readBalanceStoreUserTotalStocks(userId, stockSymbol)!

			//lock stock for transaction
			const previousLockedStocks = readBalanceStoreUserLockedStocks(userId, stockSymbol)!
			BALANCE_STORE[userId].stock[stockSymbol].locked = (previousLockedStocks + quantity);


			//reduce quantity in orderbook 
			const previousRemainingQuantity = ORDERBOOK_STORE[stockSymbol].bid[price].remainingQuantity
			ORDERBOOK_STORE[stockSymbol].bid[price].remainingQuantity = previousRemainingQuantity - quantity

			//add order in orderbook
			ORDERBOOK_STORE[stockSymbol].bid[price].orders.push({
				userId,
				quantity:bidInfo.totalQuantity,
				filledQuantity:quantity,
				orderId:"1",
				createdAt: new Date().toISOString()
			})

			//after all stocks are sold , reduce balance and total stock balance
			BALANCE_STORE[userId].stock[stockSymbol].total = (previousTotalStocks - quantity);
			BALANCE_STORE[userId].stock[stockSymbol].locked = ( BALANCE_STORE[userId].stock[stockSymbol].locked - quantity);

			//update INR balance
			const oldInrBalance = BALANCE_STORE[userId].balance["inr"]?.total
			//@ts-ignore
			BALANCE_STORE[userId].balance["inr"].total = ( oldInrBalance + (price * quantity))

			return res.json(new HttpSuccessResponse(200, true, "Order Placed", ORDERBOOK_STORE[stockSymbol]))
		}

		//partial fullfillment of ask order --> implies requested amount > available bids
		const previousTotalStocks = readBalanceStoreUserTotalStocks(userId, stockSymbol)!;
		const remainingStocksToSell = (quantity - bidInfo.remainingQuantity);

		//delete bid entry from order book 
			//tbd add fills db
		delete ORDERBOOK_STORE[stockSymbol].bid[price]

		//add ask entry to the order book
		actionCreateAsk(userId, stockSymbol, remainingStocksToSell, price)

		//update user balances for sold stocks
		updateBalanceStoreUserTotalStocks(userId, stockSymbol, (previousTotalStocks - quantity));
		updateBalanceStoreUserLockedStocks(userId, stockSymbol,(readBalanceStoreUserLockedStocks(userId, stockSymbol)! - quantity));


		//update INR balance
		const oldInrBalance:any = BALANCE_STORE[userId]?.balance["inr"]?.total 

		updateBalanceStoreUserTotalBalance(userAvailableStock.toString(), ( oldInrBalance + (price * bidInfo.remainingQuantity)));

		return res.json(new HttpSuccessResponse(200, true, "Order Placed", ORDERBOOK_STORE[stockSymbol]))
	}
}

/*
	FUNCTIONS CREATED AS ACTIONS that are performed on ORDER BOOK
*/
const actionCreateAsk = (userId:string , stockSymbol:string, quantity:number, price:number) => {

	if(!BALANCE_STORE[userId] || !BALANCE_STORE[userId].stock[stockSymbol]){
		return false
	}

	if(!ORDERBOOK_STORE[stockSymbol]){
		return false
	}

	const previousLockedStocks = BALANCE_STORE[userId].stock[stockSymbol].locked; 
	BALANCE_STORE[userId].stock[stockSymbol].locked = (previousLockedStocks + quantity);

	//update orderbook
	ORDERBOOK_STORE[stockSymbol].ask[price] = {
		totalQuantity:quantity,
		remainingQuantity:quantity,
		orders:[{
			userId:"1",
			quantity,
			filledQuantity:0,
			orderId:"1",
			createdAt: new Date().toISOString()
		}]
	}

	return true
}
