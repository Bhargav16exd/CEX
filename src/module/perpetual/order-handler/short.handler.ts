import type { Request, Response } from "express";
import { addPriceToOrderBookIndex, PERPETUAL_ORDERBOOK_STORE, PERPETUAL_ORDERBOOK_STORE_INDEX } from "../orderbook/prep-orderbook.js";
import { HttpErrorResponse, HttpSuccessResponse } from "../../../utils/http.responses.js";
import { readBalanceStoreUserLockedBalance, readBalanceStoreUserTotalBalance, updateBalanceStoreUserLockedBalance } from "../balances/perp-balances.js";
import { OrderType } from "./long.handler.js";
import { hanldeContracts } from "../contract-handler/contract.handler.js";
import { CONTRACT_STORE } from "../contracts/contracts-store.js";


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

	//lock amounts

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

			return res.json(new HttpSuccessResponse(200, true, "Order Placed",PERPETUAL_ORDERBOOK_STORE[stockSymbol]))
		}
		else{

			//create long
			actionCreateShort(userId, stockSymbol, userPrice, quantity)
			return res.json(new HttpSuccessResponse(200, true, "Order Placed", PERPETUAL_ORDERBOOK_STORE[stockSymbol]));
		}
	}

	handlePriceNotAvailableInLimitOrder(req, res, userId, stockSymbol, type, side, userPrice, quantity, collateral);
}

const handlePriceNotAvailableInLimitOrder = (req: Request, res: Response, userId: string, stockSymbol: string, type: string, side: string, userPrice: number, userQuantity: number, collateral:number) => {

	let fullfilledQuantity = 0;
	let totalAmountSpent = 0;
	let count = 0;
	const orderbook_long_index_length = PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol]?.long.length!

	if(!PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol] || !PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol]) return
	if(!PERPETUAL_ORDERBOOK_STORE[stockSymbol]) return

	for(let i = orderbook_long_index_length - 1 ; i >= 0 ; i--){

		const price = PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].long[i]!;

		if(price < userPrice &&  fullfilledQuantity != userQuantity){
			actionCreateShort(userId, stockSymbol, userPrice, (userQuantity - fullfilledQuantity));
			break;
		}

		if(fullfilledQuantity == userQuantity || price < userPrice){
			break;
		}

		const longInfo = PERPETUAL_ORDERBOOK_STORE[stockSymbol]?.long[price]!

		if(longInfo?.remainingQuantity == (userQuantity - fullfilledQuantity)){

			//delete 
			delete PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[price];

			hanldeContracts(stockSymbol, longInfo.remainingQuantity, price, longInfo.orders[0]!.userId, userId, collateral);

			count++;
			break;
		}

		if(longInfo?.remainingQuantity > (userQuantity - fullfilledQuantity)){

			//update remaining quanitity in the stock
			const remainingStockQuantity = longInfo.remainingQuantity;
			PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[price]!.remainingQuantity = remainingStockQuantity - (userQuantity - fullfilledQuantity);
			PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[price]?.orders.push({
				userId,
				quantity:longInfo.totalQuantity,
				filledQuantity:(userQuantity - fullfilledQuantity),
				orderId:"1",
				createdAt: new Date().toISOString()
			})
		
			hanldeContracts(stockSymbol, (userQuantity - fullfilledQuantity), price, longInfo.orders[0]!.userId, userId, collateral);

			break;
		}

		//if code reaches here , it means , the available quantity of certain stock doesnt fullfill user requriements

		//update fullfilled quantity
		fullfilledQuantity = fullfilledQuantity + longInfo.remainingQuantity;

		//delete entry at that price
		delete PERPETUAL_ORDERBOOK_STORE[stockSymbol].long[price]

		if(price == userPrice){
			actionCreateShort(userId, stockSymbol, userPrice, (userQuantity - fullfilledQuantity));
		}


		if(price == PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].long[0]){
			actionCreateShort(userId, stockSymbol, userPrice, (userQuantity - fullfilledQuantity));
		}

		count ++;

		hanldeContracts(stockSymbol, longInfo.remainingQuantity, price, longInfo.orders[0]!.userId, userId, collateral);
	}


	while(count > 0 ){
		PERPETUAL_ORDERBOOK_STORE_INDEX[stockSymbol].long.pop();
		count--;
	}

	console.log("CONTRACTS",CONTRACT_STORE)

	return res.json(new HttpSuccessResponse(200, true, "Order Placed", PERPETUAL_ORDERBOOK_STORE[stockSymbol]));
}

const actionCreateShort = (userId:string, stockSymbol:string, userPrice:number, quantity:number) => {

	if(!PERPETUAL_ORDERBOOK_STORE[stockSymbol]) return

	PERPETUAL_ORDERBOOK_STORE[stockSymbol].short[userPrice] = {
		totalQuantity:quantity,
		remainingQuantity:quantity,
		orders:[{
			userId,
			quantity,
			filledQuantity:0,
			orderId:"1",
			createdAt: new Date().toISOString()
		}]
	}

	addPriceToOrderBookIndex(stockSymbol, "short", userPrice)

	return true
}

const handleOrderTypeMarket = () => {

}