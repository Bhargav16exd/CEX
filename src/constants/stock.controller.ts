import type { Request, Response } from "express"
import { HttpErrorResponse, HttpSuccessResponse } from "../utils/http.responses.js"
import BALANCE_STORE from "../memory-store/balance/balance-store.js";
import { ORDERBOOK_STORE } from "../memory-store/orderbook/orderbook-store.js";
import { randomUUID } from "crypto";

// ------ Order Region Start -----
/*
	stockSymbol 					=> to identify which stock
	side - SELL  | BUY 		=> to identify is order a BUY OR SELL
	type - LIMIT | MARKET => to identity order type
*/

enum OrderType {
	LIMIT = "LIMIT",
	MARKET = "MARKET"
} 

enum OrderSide {
	ASK = "ASK",
	BID = "BID"
}

export const Order = (req:Request, res:Response) => {
	try {	
		const {userId, stockSymbol, side, type, price, quantity} = req.body

		if(!userId || !stockSymbol || !side || !type || !price || !quantity ){
			throw new HttpErrorResponse(400, false, "Invalid Inputs");
		}
		
		if(side == OrderSide.ASK){
			hanldeOrderSideAsk(req, res , userId, stockSymbol, side, type, price, quantity)
		}

		if(side == OrderSide.BID){
			hanldeOrderSideBid()
		}

	} catch (error) {
		console.log(error)
	}
}
// ------ Order Region End -----

function hanldeOrderSideAsk(req:Request, res:Response , userId:string, stockSymbol:string, side:string, type:string, price:number, quantity:number){

	//if that stock doesnt exist in order book create an entry for that
	if(!ORDERBOOK_STORE[stockSymbol]){
		ORDERBOOK_STORE[stockSymbol] = {
			ask : {},
			bid: {}
		}
	}

	if(!BALANCE_STORE[userId]){
		return
	}

	if(!BALANCE_STORE[userId].stock[stockSymbol]){
		return
	}

	const userAvailableStock = BALANCE_STORE[userId]?.stock[stockSymbol].total - BALANCE_STORE[userId]?.stock[stockSymbol]?.locked


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


	if(type == OrderType.LIMIT){

		//if bid for that price doesnt exist , sit in ask side of orderbook
		if(!ORDERBOOK_STORE[stockSymbol]?.bid[price]){
			
			//lock stock balance
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

			return res.json(new HttpSuccessResponse(200, true, "Order Placed",ORDERBOOK_STORE[stockSymbol]))
		}

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

			//update lock stock balance
			const previousTotalStocks = BALANCE_STORE[userId].stock[stockSymbol].total; 
			const previousLockedStocks = BALANCE_STORE[userId].stock[stockSymbol].locked; 

			//lock stock for transaction
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

			//after all stocks are sold , reduce lock balance and total stock balance
			BALANCE_STORE[userId].stock[stockSymbol].total = (previousTotalStocks - quantity);
			BALANCE_STORE[userId].stock[stockSymbol].locked = ( BALANCE_STORE[userId].stock[stockSymbol].locked - quantity);

			//update INR balance
			const oldInrBalance = BALANCE_STORE[userId].balance["inr"]?.total
			//@ts-ignore
			BALANCE_STORE[userId].balance["inr"].total = ( oldInrBalance + (price * quantity))

			return res.json(new HttpSuccessResponse(200, true, "Order Placed", ORDERBOOK_STORE[stockSymbol]))
		}

		//partial fullfillment of ask order --> implies requested amount > available bids
		const previousTotalStocks = BALANCE_STORE[userId].stock[stockSymbol].total; 
		const previousLockedStocks = BALANCE_STORE[userId].stock[stockSymbol].locked; 

		//lock stock for transaction
		BALANCE_STORE[userId].stock[stockSymbol].locked = (previousLockedStocks + quantity);

		const remainingStocksToSell = (quantity - bidInfo.remainingQuantity);

		//delete bid entry from order book 
			//tbd add fills db
		delete ORDERBOOK_STORE[stockSymbol].bid[price]

		//add ask entry to the order book
		ORDERBOOK_STORE[stockSymbol].ask[price] = {
				totalQuantity:remainingStocksToSell,
				remainingQuantity:remainingStocksToSell,
				orders:[{
					userId:"1",
					quantity:remainingStocksToSell,
					filledQuantity:0,
					orderId: randomUUID(),
					createdAt: new Date().toISOString()
				}]
		}

		//update user balances for sold stocks
		BALANCE_STORE[userId].stock[stockSymbol].total = (previousTotalStocks - quantity);
		BALANCE_STORE[userId].stock[stockSymbol].locked = ( BALANCE_STORE[userId].stock[stockSymbol].locked - quantity);


		//update INR balance
		const oldInrBalance = BALANCE_STORE[userId].balance["inr"]?.total
		//@ts-ignore
		BALANCE_STORE[userId].balance["inr"].total = ( oldInrBalance + (price * bidInfo.remainingQuantity))

		return res.json(new HttpSuccessResponse(200, true, "Order Placed", ORDERBOOK_STORE[stockSymbol]))
	}
}

function hanldeOrderSideBid(){

}