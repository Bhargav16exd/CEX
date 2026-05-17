import type { Request, Response } from "express";
import { addPriceToOrderBookIndex, createOrder, fetchFullFilledQuantityFromOrderId, ORDERS, PERPETUAL_ORDERBOOK_STORE, PERPETUAL_ORDERBOOK_STORE_INDEX, updateOrderFullFilledQuantity } from "../orderbook/prep-orderbook.js";
import { HttpErrorResponse, HttpSuccessResponse } from "../../../utils/http.responses.js";
import { readBalanceStoreUserLockedBalance, readBalanceStoreUserTotalBalance, updateBalanceStoreUserLockedBalance } from "../balances/perp-balances.js";
import { OrderType, updateOrderOfMakers, type OrderInputPayload } from "./long.handler.js";
import { hanldeContracts } from "../contract-handler/contract.handler.js";
import { CONTRACT_STORE } from "../contracts/contracts-store.js";
import { randomUUID } from "crypto";


export const hanldeShortOrders = (payload: OrderInputPayload) => {

	const { req, res, userId, stockSymbol, type, side, price, quantity, collateral, reduceOnly } = payload;

	//check if total user balance if enough for given collateral
	const userAvailableBalance = readBalanceStoreUserTotalBalance(userId) - readBalanceStoreUserLockedBalance(userId);

	if(userAvailableBalance < collateral){
		throw new HttpErrorResponse(400, false, "Not Enough Balance for Collateral")
	}

	//if enough , update locked balance
	const previousUserLockedBalance = readBalanceStoreUserLockedBalance(userId);
	updateBalanceStoreUserLockedBalance(userId, (previousUserLockedBalance + collateral));

	if(type == OrderType.LIMIT){
		handleOrderTypeLimit(req, res, userId, stockSymbol, type, side, price, quantity, collateral);
	}

	if(type == OrderType.MARKET){
		handleOrderTypeMarket()
	}
}

const handleOrderTypeLimit = (req: Request, res: Response, userId: string, stockSymbol: string, type: string, side: string, userPrice: number, quantity: number, collateral:number) => {

	if(!PERPETUAL_ORDERBOOK_STORE[stockSymbol]) return
	if(!PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol] || !PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].long) return

	const orderbook_long_index_length = PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].long.length

	const orderId = randomUUID();
	createOrder(orderId, stockSymbol, userPrice, quantity, "short", userId);

	if(
		!PERPETUAL_ORDERBOOK_STORE[stockSymbol]?.long[userPrice] 
		&& (orderbook_long_index_length == 0 
			||
			userPrice > PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].long[orderbook_long_index_length - 1]!
		)
	){

		if(PERPETUAL_ORDERBOOK_STORE[stockSymbol].short[userPrice]){
			const totalQuantity = PERPETUAL_ORDERBOOK_STORE[stockSymbol].short[userPrice].totalQuantity
			const remainingQuantity = PERPETUAL_ORDERBOOK_STORE[stockSymbol].short[userPrice].remainingQuantity

			PERPETUAL_ORDERBOOK_STORE[stockSymbol].short[userPrice].totalQuantity = totalQuantity + quantity
			PERPETUAL_ORDERBOOK_STORE[stockSymbol].short[userPrice].remainingQuantity = remainingQuantity + quantity

			const isUserAlreadyInSameOrder = PERPETUAL_ORDERBOOK_STORE[stockSymbol].short[userPrice].makerIds[userId] ? true : false;

			if(!isUserAlreadyInSameOrder){
				PERPETUAL_ORDERBOOK_STORE[stockSymbol].short[userPrice].makerIds[userId] = [orderId];
			}else{
				PERPETUAL_ORDERBOOK_STORE[stockSymbol].short[userPrice].makerIds[userId]!.push(orderId);
			}

			return res.json(new HttpSuccessResponse(200, true, "Order Placed",PERPETUAL_ORDERBOOK_STORE[stockSymbol]))
		}
		else{

			//create long
			actionCreateShort(userId, stockSymbol, userPrice, quantity, orderId);
			return res.json(new HttpSuccessResponse(200, true, "Order Placed", PERPETUAL_ORDERBOOK_STORE[stockSymbol]));
		}
	}

	handlePriceNotAvailableInLimitOrder(req, res, userId, stockSymbol, type, side, userPrice, quantity, collateral, orderId);
}

const handlePriceNotAvailableInLimitOrder = (req: Request, res: Response, userId: string, stockSymbol: string, type: string, side: string, userPrice: number, userQuantity: number, collateral:number, orderId:string) => {

	let fullfilledQuantity = 0;
	let totalAmountSpent = 0;
	let count = 0;
	const orderbook_long_index_length = PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol]?.long.length!

	if(!PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol] || !PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol]) return
	if(!PERPETUAL_ORDERBOOK_STORE[stockSymbol]) return

	for(let i = orderbook_long_index_length - 1 ; i >= 0 ; i--){

		const price = PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].long[i]!;

		if(price < userPrice &&  fullfilledQuantity != userQuantity){
			actionCreateShort(userId, stockSymbol, userPrice, (userQuantity - fullfilledQuantity), orderId);
			break;
		}

		if(fullfilledQuantity == userQuantity || price < userPrice){
			break;
		}

		const longInfo = PERPETUAL_ORDERBOOK_STORE[stockSymbol]?.long[price]!

		if(longInfo?.remainingQuantity == (userQuantity - fullfilledQuantity)){

			updateOrderOfMakers(longInfo.makerIds, longInfo?.remainingQuantity);

			//delete 
			delete PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[price];

			//hanldeContracts(stockSymbol, longInfo.remainingQuantity, price, longInfo.orders[0]!.userId, userId, collateral);
			updateOrderFullFilledQuantity(orderId, fetchFullFilledQuantityFromOrderId(orderId) + longInfo.remainingQuantity);

			count++;
			break;
		}

		if(longInfo?.remainingQuantity > (userQuantity - fullfilledQuantity)){

			updateOrderOfMakers(longInfo.makerIds, (userQuantity - fullfilledQuantity));

			//update remaining quanitity in the stock
			const remainingStockQuantity = longInfo.remainingQuantity;
			PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[price]!.remainingQuantity = remainingStockQuantity - (userQuantity - fullfilledQuantity);
		
			//hanldeContracts(stockSymbol, (userQuantity - fullfilledQuantity), price, longInfo.orders[0]!.userId, userId, collateral);
			updateOrderFullFilledQuantity(orderId, fetchFullFilledQuantityFromOrderId(orderId) + (userQuantity - fullfilledQuantity));

			break;
		}

		//if code reaches here , it means , the available quantity of certain stock doesnt fullfill user requriements

		updateOrderOfMakers(longInfo.makerIds, (userQuantity - fullfilledQuantity));

		//update fullfilled quantity
		fullfilledQuantity = fullfilledQuantity + longInfo.remainingQuantity;

		//delete entry at that price
		delete PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[price]

		if(price == userPrice){
			actionCreateShort(userId, stockSymbol, userPrice, (userQuantity - fullfilledQuantity), orderId);
		}


		if(price == PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].long[0]){
			actionCreateShort(userId, stockSymbol, userPrice, (userQuantity - fullfilledQuantity), orderId);
		}

		count ++;

		//hanldeContracts(stockSymbol, longInfo.remainingQuantity, price, longInfo.orders[0]!.userId, userId, collateral);
		updateOrderFullFilledQuantity(orderId, fetchFullFilledQuantityFromOrderId(orderId) + longInfo.remainingQuantity);
	}


	while(count > 0 ){
		PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].long.pop();
		count--;
	}

	//update taker
	updateOrderFullFilledQuantity(orderId, fullfilledQuantity);
	console.log("ORDERS", ORDERS)

	return res.json(new HttpSuccessResponse(200, true, "Order Placed", PERPETUAL_ORDERBOOK_STORE[stockSymbol]));
}

const actionCreateShort = (userId:string, stockSymbol:string, userPrice:number, quantity:number, orderId:string) => {

	if(!PERPETUAL_ORDERBOOK_STORE[stockSymbol]) return

	PERPETUAL_ORDERBOOK_STORE[stockSymbol].short[userPrice] = {
		totalQuantity:quantity,
		remainingQuantity:quantity,
		makerIds:{
			[userId]:[orderId],
		},
		takerIds:{}
	}

	addPriceToOrderBookIndex(stockSymbol, "short", userPrice)

	return true
}

const handleOrderTypeMarket = () => {

}