import type { Request, Response } from "express";
import { addPriceToOrderBookIndex, fetchFullFilledQuantityFromOrderId, ORDERS, PERPETUAL_ORDERBOOK_STORE, PERPETUAL_ORDERBOOK_STORE_INDEX, updateOrderFullFilledQuantity } from "../orderbook/prep-orderbook.js";
import { HttpErrorResponse, HttpSuccessResponse } from "../../../utils/http.responses.js";
import { readBalanceStoreUserLockedBalance, readBalanceStoreUserTotalBalance, updateBalanceStoreUserLockedBalance } from "../balances/perp-balances.js";
import {createOrder} from "../orderbook/prep-orderbook.js"
import { randomUUID } from "crypto";

export enum OrderType {
	LIMIT = "LIMIT",
	MARKET = "MARKET"
}

export type OrderInputPayload = {
	req:Request,
	res:Response,
	userId:string,
	stockSymbol:string,
	type:OrderType,
	side:string,
	price:number,
	quantity:number,
	collateral:number,
	reduceOnly:boolean
}

export const hanldeLongOrders = (payload: OrderInputPayload) => {

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
	if(!PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol] || !PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].short) return

	const orderbook_short_index_length = PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].short.length

	const orderId = randomUUID();
	createOrder(orderId, stockSymbol, userPrice, quantity, "long", userId);

	if(
		!PERPETUAL_ORDERBOOK_STORE[stockSymbol]?.short[userPrice] 
		&& (orderbook_short_index_length == 0 
			||
			userPrice < PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].short[0]!
		)
	){

		if(PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[userPrice]){
			const totalQuantity = PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[userPrice].totalQuantity
			const remainingQuantity = PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[userPrice].remainingQuantity

			PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[userPrice].totalQuantity = totalQuantity + quantity
			PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[userPrice].remainingQuantity = remainingQuantity + quantity

			const isUserAlreadyInSameOrder = PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[userPrice].makerIds[userId] ? true : false;

			if(!isUserAlreadyInSameOrder){
				PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[userPrice].makerIds[userId] = [orderId];
			}
			else{
				PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[userPrice].makerIds[userId]!.push(orderId);
			}

			return res.json(new HttpSuccessResponse(200, true, "Order Placed",PERPETUAL_ORDERBOOK_STORE[stockSymbol]))
		}
		else{

			//create long
			actionCreateLong(userId, stockSymbol, userPrice, quantity, orderId)
			return res.json(new HttpSuccessResponse(200, true, "Order Placed", PERPETUAL_ORDERBOOK_STORE[stockSymbol]));
		}
	}

	handlePriceNotAvailableInLimitOrder(req, res, userId, stockSymbol, type, side, userPrice, quantity, collateral, orderId);
}

const handlePriceNotAvailableInLimitOrder = (req: Request, res: Response, userId: string, stockSymbol: string, type: string, side: string, userPrice: number, userQuantity: number, collateral: number, orderId: string) => {

	let fullfilledQuantity = 0;
	let totalAmountSpent = 0;
	let count = 0;
	const orderbook_short_index_length = PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol]?.short.length!

	if(!PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol]) return
	if(!PERPETUAL_ORDERBOOK_STORE[stockSymbol]) return

	for(const price of PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].short){

		if(price > userPrice &&  fullfilledQuantity != userQuantity){
			actionCreateLong(userId, stockSymbol, userPrice, (userQuantity - fullfilledQuantity), orderId);
			break;
		}

		if(fullfilledQuantity == userQuantity || price > userPrice){
			break;
		}

		const shortInfo = PERPETUAL_ORDERBOOK_STORE[stockSymbol]?.short[price]!


		if(shortInfo?.remainingQuantity == (userQuantity - fullfilledQuantity)){

			updateOrderOfMakers(shortInfo.makerIds, shortInfo.remainingQuantity);

			//delete 
			delete PERPETUAL_ORDERBOOK_STORE[stockSymbol].short[price];

			count++;

			//hanldeContracts(stockSymbol, shortInfo.remainingQuantity, price, userId, shortInfo.orders[0]!.userId, collateral)
			updateOrderFullFilledQuantity(orderId, fetchFullFilledQuantityFromOrderId(orderId) + shortInfo.remainingQuantity);

			break;
		}

		if(shortInfo?.remainingQuantity > (userQuantity - fullfilledQuantity) ){


			//update remaining quanitity in the stock
			const remainingStockQuantity = shortInfo.remainingQuantity;

			updateOrderOfMakers(shortInfo.makerIds, (userQuantity - fullfilledQuantity));

			PERPETUAL_ORDERBOOK_STORE[stockSymbol].short[price]!.remainingQuantity = remainingStockQuantity - (userQuantity - fullfilledQuantity);
			
			//hanldeContracts(stockSymbol, (userQuantity - fullfilledQuantity), price, userId, shortInfo.orders[0]!.userId, collateral)
			updateOrderFullFilledQuantity(orderId, fetchFullFilledQuantityFromOrderId(orderId) + (userQuantity - fullfilledQuantity));

			break;
		}

		//if code reaches here , it means , the available quantity of certain stock doesnt fullfill user requriements

		updateOrderOfMakers(shortInfo.makerIds, (userQuantity - fullfilledQuantity));

		//update fullfilled quantity
		fullfilledQuantity = fullfilledQuantity + shortInfo.remainingQuantity;

		//delete entry at that price
		delete PERPETUAL_ORDERBOOK_STORE[stockSymbol].short[price];

		if(price == userPrice){
			actionCreateLong(userId, stockSymbol, userPrice, (userQuantity - fullfilledQuantity), orderId);
		}


		if(price == PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].short[orderbook_short_index_length-1]){
			actionCreateLong(userId, stockSymbol, userPrice, (userQuantity - fullfilledQuantity), orderId);
		}

		count ++;

		//hanldeContracts(stockSymbol, shortInfo.remainingQuantity, price, userId, shortInfo.orders[0]!.userId, collateral);
		updateOrderFullFilledQuantity(orderId, fetchFullFilledQuantityFromOrderId(orderId) + shortInfo.remainingQuantity);
	}

	while(count > 0){
		PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].short.shift();
		count--;
	}

	console.log("ORDERS", ORDERS)

	return res.json(new HttpSuccessResponse(200, true, "Order Placed", PERPETUAL_ORDERBOOK_STORE[stockSymbol]));
}

const actionCreateLong = (userId:string, stockSymbol:string, userPrice:number, quantity:number, orderId:string) => {

	if(!PERPETUAL_ORDERBOOK_STORE[stockSymbol]) return

	PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[userPrice] = {
		totalQuantity:quantity,
		remainingQuantity:quantity,
		makerIds:{
			[userId]: [orderId]
		},
		takerIds:{}
	}

	addPriceToOrderBookIndex(stockSymbol, "long", userPrice)
	return true
}

const handleOrderTypeMarket = () => {

}

export const updateOrderOfMakers = (userIds: Record<string,Array<string>>, quantity: number) => {

	/*
	 input quantity is remaining quantitiy left for that price bracket
	 userIds: { <userId>: [orderId1, orderId2]  , <userId2>: [orderId3, orderId4] }
	*/

	/*
   we traverse over each order and upates their fullfilled quantity  
	*/

	let fullfilledQuantity = 0;

	for(const userId in userIds){

		userIds[userId]?.forEach((orderId)=>{

			const order = ORDERS[orderId]

			if(order?.quantity! <= (quantity - fullfilledQuantity)){
				updateOrderFullFilledQuantity(orderId, order?.quantity!);
				fullfilledQuantity = fullfilledQuantity + order?.quantity!
			}
			else{
				updateOrderFullFilledQuantity(orderId, order?.fullFilledQuantity! + (quantity - fullfilledQuantity))
			}

		})

	}

}
