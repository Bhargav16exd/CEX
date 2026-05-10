import type { Request, Response } from "express";
import { addPriceToOrderBookIndex, ORDERBOOK_STORE, ORDERBOOK_STORE_INDEX } from "../../memory-store/orderbook/orderbook-store.js";
import BALANCE_STORE, { readBalanceStoreUserLockedBalance, readBalanceStoreUserTotalBalance, readBalanceStoreUserTotalStocks, updateBalanceStoreUserTotalBalance, updateBalanceStoreUserTotalStocks } from "../../memory-store/balance/balance-store.js";
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";
import { Order, OrderType } from "../../controllers/stock.controller.js";


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

	if(!BALANCE_STORE[userId] || !BALANCE_STORE[userId].balance["inr"]) return

	if(type == OrderType.LIMIT){

		/*
			SCENARIO 1 - USER WANTS TO BUY BUT NO CORRESPONDING ASK WITH SAME PRICE IS AVAILABLE
			ACTION - WE PUT BID IN ORDERBOOK
		*/
		if(!ORDERBOOK_STORE[stockSymbol].ask[price]){
			actionCreateBid(userId, stockSymbol, quantity, price);
			return res.json(new HttpSuccessResponse(200, true, "Order Placed",ORDERBOOK_STORE[stockSymbol]));
		}

		/*
			SCENARIO 2 - USER WANTS TO BUY && ASK WITH SAME PRICE IS AVAILABLE , depending on quantity available for sale we perform actions
		  ACTION - WE PUT BID IN ORDERBOOK OR DELETE WHOLE BID IF REQUIRED
		*/

		handlePriceAvailableForOrderTypeLimit(req, res, userId,  stockSymbol, side, type, price, quantity);
	}


	if(type == OrderType.MARKET){
		handleOrderTypeMarket(req, res, userId, stockSymbol, side, type, price, quantity);
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

	//update orderbook index
	addPriceToOrderBookIndex(stockSymbol, "bid", price);

	return true
}

const handlePriceAvailableForOrderTypeLimit = (req:Request, res:Response , userId:string, stockSymbol:string, side:string, type:string, userPrice:number, quantity:number) => {

	if(!ORDERBOOK_STORE_INDEX[stockSymbol]) return false;
	if(!BALANCE_STORE[userId] || !BALANCE_STORE[userId].balance["inr"]) return;
	let fullFilledQuantity = 0;
	let count = 0

	for(const price of ORDERBOOK_STORE_INDEX[stockSymbol].ask){

		if(price > userPrice || quantity == fullFilledQuantity){
			break;
		}

		//@ts-ignore
		const askInfo = ORDERBOOK_STORE[stockSymbol].ask[price]!

		if(!ORDERBOOK_STORE[stockSymbol] || !ORDERBOOK_STORE[stockSymbol].ask[price]) return false;

		if(askInfo.remainingQuantity == (quantity - fullFilledQuantity)){
			//tbd
			//add entry in db for fills

			//delete both entries
			delete ORDERBOOK_STORE[stockSymbol].ask[price];

			//update user stocks
			const oldStocks = readBalanceStoreUserTotalStocks(userId, stockSymbol)!;
			const previousTotalBalance = readBalanceStoreUserTotalBalance(userId);

			updateBalanceStoreUserTotalStocks(userId, stockSymbol, (oldStocks + askInfo.remainingQuantity));
			updateBalanceStoreUserTotalBalance(userId, (previousTotalBalance - (price * askInfo.remainingQuantity)));

			count++;
			break;
		}

		if(askInfo.remainingQuantity > (quantity - fullFilledQuantity)){

			//lock balance for transaction
			const previousLockedBalance = readBalanceStoreUserLockedBalance(userId)!
			BALANCE_STORE[userId].balance["inr"].locked = previousLockedBalance + (price * quantity)

			//update order book
			const previousRemainingQuantity = ORDERBOOK_STORE[stockSymbol].ask[price].remainingQuantity;
			ORDERBOOK_STORE[stockSymbol].ask[price].remainingQuantity = previousRemainingQuantity - (quantity - fullFilledQuantity);

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
			BALANCE_STORE[userId].balance["inr"].locked = readBalanceStoreUserLockedBalance(userId) - (price * quantity);

			//update STOCK count
			const oldStockCount = BALANCE_STORE[userId].stock[stockSymbol]?.total
      //@ts-ignore
			BALANCE_STORE[userId].stock[stockSymbol].total = oldStockCount + quantity

			break;
		}

		//update fullfilled quantity
		fullFilledQuantity = fullFilledQuantity + askInfo.remainingQuantity;

		//delete ask entry from order book
			//tbd add fills db
		delete ORDERBOOK_STORE[stockSymbol].ask[price];


		//add bid entry to the order book
		//partial fullfillment of bid order --> implies requested stock amount > available ask
		if(price == userPrice){
			const remainingStockToBuy = (quantity - fullFilledQuantity);
			actionCreateBid(userId, stockSymbol, remainingStockToBuy, price);
		}
		
		//update user stocks
		const oldStocks = readBalanceStoreUserTotalStocks(userId, stockSymbol)!;
		const previousTotalBalance = readBalanceStoreUserTotalBalance(userId);

		updateBalanceStoreUserTotalStocks(userId, stockSymbol, (oldStocks + askInfo.remainingQuantity));
		updateBalanceStoreUserTotalBalance(userId, (previousTotalBalance - (price * askInfo.remainingQuantity)));

		count++;
	}

	while(count > 0){
		ORDERBOOK_STORE_INDEX[stockSymbol].ask.shift();
		count--;
	}

	console.log(ORDERBOOK_STORE_INDEX[stockSymbol]);

	return res.json(new HttpSuccessResponse(200, true, "Order Placed", ORDERBOOK_STORE[stockSymbol]));
}

const handleOrderTypeMarket = (req:Request, res:Response , userId:string, stockSymbol:string, side:string, type:string, userPrice:number, quantity:number) => {

	if(!ORDERBOOK_STORE_INDEX[stockSymbol]) return;
	if(!BALANCE_STORE[userId] ||!BALANCE_STORE[userId]?.balance["inr"] || !BALANCE_STORE[userId].stock[stockSymbol]) return;
	if(!ORDERBOOK_STORE[stockSymbol] || !ORDERBOOK_STORE[stockSymbol].ask) return;

	//lock user balance before bid begins

	let fullFilledQuantity = 0;
	let count = 0;

	
	for(const price of ORDERBOOK_STORE_INDEX[stockSymbol].ask){

		if(fullFilledQuantity == quantity){
			break;
		}

		const askInfo = ORDERBOOK_STORE[stockSymbol]?.ask[price]!

		if(!ORDERBOOK_STORE[stockSymbol].ask[price]) return;
	
		if(askInfo.remainingQuantity == (quantity - fullFilledQuantity)){

			//increment full quantity
			fullFilledQuantity = fullFilledQuantity + askInfo.remainingQuantity;

			//delete entity
			delete ORDERBOOK_STORE[stockSymbol]?.ask[price];

			//read user balance and stock
			const userBalanceTotal = readBalanceStoreUserTotalBalance(userId);
			const userStocksTotal = readBalanceStoreUserTotalStocks(userId, stockSymbol)!;

			//udpate balance and stocks
			BALANCE_STORE[userId].balance["inr"].total = userBalanceTotal - (askInfo.remainingQuantity * price);
			BALANCE_STORE[userId].stock[stockSymbol].total = userStocksTotal + askInfo.remainingQuantity;
			count++;
			break;
		}

		if(askInfo.remainingQuantity > (quantity - fullFilledQuantity)){

			//update store
			ORDERBOOK_STORE[stockSymbol].ask[price].remainingQuantity = ORDERBOOK_STORE[stockSymbol].ask[price].remainingQuantity - (quantity - fullFilledQuantity);

			//add order in order book
			ORDERBOOK_STORE[stockSymbol].ask[price].orders.push({
				userId,
				quantity:askInfo.totalQuantity,
				filledQuantity:(quantity - fullFilledQuantity),
				orderId:"1",
				createdAt: new Date().toISOString()
			})

			//read user balance and stocks
			const userBalanceTotal = readBalanceStoreUserTotalBalance(userId);
			const userStocksTotal = readBalanceStoreUserTotalStocks(userId, stockSymbol)!;

			//update 
			BALANCE_STORE[userId].balance["inr"].total = userBalanceTotal - ((quantity - fullFilledQuantity) * price);
			BALANCE_STORE[userId].stock[stockSymbol].total = userStocksTotal + (quantity - fullFilledQuantity);

			break;
		}

		//increment fullfill quantitiy
		fullFilledQuantity = fullFilledQuantity + askInfo.remainingQuantity;

		//delete entity
		delete ORDERBOOK_STORE[stockSymbol]?.ask[price];

		//read user balance and stock
		const userBalanceTotal = readBalanceStoreUserTotalBalance(userId);
		const userStocksTotal = readBalanceStoreUserTotalStocks(userId, stockSymbol)!;

		//udpate balance and stocks
		BALANCE_STORE[userId].balance["inr"].total = userBalanceTotal - (askInfo.remainingQuantity * price);
		BALANCE_STORE[userId].stock[stockSymbol].total = userStocksTotal + askInfo.remainingQuantity;
		count++;
	}

	while(count > 0){
		ORDERBOOK_STORE_INDEX[stockSymbol].ask.shift();
		count--;
	}

	if(count == ORDERBOOK_STORE_INDEX[stockSymbol].ask.length){
		return res.json(new HttpSuccessResponse(200, true, `Pratial Order Completed [Remaining Amount] : ${quantity-fullFilledQuantity}`, ORDERBOOK_STORE[stockSymbol]));
	}

	return res.json(new HttpSuccessResponse(200, true, "Order Placed", ORDERBOOK_STORE[stockSymbol]));
}