import type { Request, Response } from "express";
import { ORDERBOOK_STORE } from "../../memory-store/orderbook/orderbook-store.js";
import BALANCE_STORE, { readBalanceStoreUserLockedBalance, readBalanceStoreUserTotalBalance, readBalanceStoreUserTotalStocks, updateBalanceStoreUserTotalBalance, updateBalanceStoreUserTotalStocks } from "../../memory-store/balance/balance-store.js";
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";
import { OrderType } from "../../controllers/stock.controller.js";


export function hanldeOrderSideBid(req:Request, res:Response , userId:string, stockSymbol:string, side:string, type:string, price:number, quantity:number){

	if(!ORDERBOOK_STORE[stockSymbol]){
			ORDERBOOK_STORE[stockSymbol] = {
					ask:{},
					bid:{}
			}
	}
	
	const userAvailableBalance = readBalanceStoreUserTotalBalance(userId)! - readBalanceStoreUserLockedBalance(userId)!

	if(!userAvailableBalance){
		console.log(userAvailableBalance)
		//tbd
		//user owned stocks are not found in memory 
		//refresh memory
		//retry and throw error
		return
	}

	if((price * quantity) > userAvailableBalance){
		throw new HttpErrorResponse(200,false, "Insufficient Balance");
	}

	if(!BALANCE_STORE[userId] || !BALANCE_STORE[userId].balance["inr"]){
		return
	}

	if(type == OrderType.LIMIT){

		/*
			SCENARIO 1 - USER WANTS TO BUY BUT NO CORRESPONDING ASK WITH SAME PRICE IS AVAILABLE
			ACTION - WE PUT BID IN ORDERBOOK
		*/

		if(!ORDERBOOK_STORE[stockSymbol].ask[price]){
			actionCreateBid(userId, stockSymbol, quantity, price)
			return res.json(new HttpSuccessResponse(200, true, "Order Placed",ORDERBOOK_STORE[stockSymbol]));
		}

		/*
			SCENARIO 2 - USER WANTS TO BUY && ASK WITH SAME PRICE IS AVAILABLE , depending on quantity available for sale we perform actions
		  ACTION - WE PUT BID IN ORDERBOOK OR DELETE WHOLE BID IF REQUIRED
		*/

		const askInfo = ORDERBOOK_STORE[stockSymbol].ask[price]

		if(askInfo.remainingQuantity == quantity){
			//tbd
			//delete both entries
			//add entry in db for fills
		}

		if(askInfo.remainingQuantity > quantity){

			//lock balance for transaction
			const previousLockedBalance = readBalanceStoreUserLockedBalance(userId)!
			BALANCE_STORE[userId].balance["inr"].locked = previousLockedBalance + (price * quantity)

			//update order book
			const previousRemainingQuantity = ORDERBOOK_STORE[stockSymbol].ask[price].remainingQuantity;
			ORDERBOOK_STORE[stockSymbol].ask[price].remainingQuantity = previousRemainingQuantity - quantity;

			//add order in orderbook
			ORDERBOOK_STORE[stockSymbol].ask[price].orders.push({
				userId,
				quantity:askInfo.totalQuantity,
				filledQuantity:quantity,
				orderId:"1",
				createdAt: new Date().toISOString()
			})

			//after all stocks are bought , reduce total balance and reset lock balance
			BALANCE_STORE[userId].balance["inr"].total = readBalanceStoreUserTotalBalance(userId) - (price * quantity);
			BALANCE_STORE[userId].balance["inr"].locked = readBalanceStoreUserLockedBalance(userId) -(price * quantity);

			//update STOCK count
			const oldStockCount = BALANCE_STORE[userId].stock[stockSymbol]?.total
      //@ts-ignore
			BALANCE_STORE[userId].stock[stockSymbol].total = oldStockCount + quantity

			return res.json(new HttpSuccessResponse(200, true, "Order Placed", ORDERBOOK_STORE[stockSymbol]))
		}

		//partial fullfillment of bid order --> implies requested stock amount > available ask
		const previousTotalBalance = readBalanceStoreUserTotalBalance(userId)
		const remainingStockToBuy = (quantity - askInfo.remainingQuantity);

		//delete ask entry from order book
			//tbd add fills db
		delete ORDERBOOK_STORE[stockSymbol].ask[price]

		//add bid entry to the order book
		actionCreateBid(userId, stockSymbol, remainingStockToBuy, price);

		//update user stocks
		const oldStocks = readBalanceStoreUserTotalStocks(userId, stockSymbol)!;

		updateBalanceStoreUserTotalStocks(userId, stockSymbol, (oldStocks + askInfo.remainingQuantity));
		updateBalanceStoreUserTotalBalance(userId, (previousTotalBalance - (price * askInfo.remainingQuantity)));

		return res.json(new HttpSuccessResponse(200, true, "Order Placed", ORDERBOOK_STORE[stockSymbol]));
	}

}

const actionCreateBid = (userId:string , stockSymbol:string, quantity:number, price:number) => {

	if(!BALANCE_STORE[userId] || !BALANCE_STORE[userId].balance["inr"]){
		return false
	}

	if(!ORDERBOOK_STORE[stockSymbol]){
		return false
	}

	const previousLockedBalance = BALANCE_STORE[userId].balance["inr"].locked; 
	BALANCE_STORE[userId].balance["inr"].locked = (previousLockedBalance + ( quantity * price ));

	//update orderbook
	ORDERBOOK_STORE[stockSymbol].bid[price] = {
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