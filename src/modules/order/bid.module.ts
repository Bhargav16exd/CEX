import type { Request, Response } from "express";
import { addPriceToOrderBookIndex, ORDERBOOK_STORE, ORDERBOOK_STORE_INDEX } from "../../memory-store/orderbook/orderbook-store.js";
import BALANCE_STORE, { readBalanceStoreUserLockedBalance, readBalanceStoreUserTotalBalance, readBalanceStoreUserTotalStocks, updateBalancesAndStockForBidOrder, updateBalanceStoreUserLockedBalance, updateBalanceStoreUserTotalBalance, updateBalanceStoreUserTotalStocks } from "../../memory-store/balance/balance-store.js";
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";
import { Order, OrderType } from "../../controllers/stock.controller.js";


export function hanldeOrderSideBid(req:Request, res:Response , userId:string, stockSymbol:string, side:string, type:string, price:number, quantity:number){

	if(!ORDERBOOK_STORE[stockSymbol]){
			ORDERBOOK_STORE[stockSymbol] = {
				ask:{},
				bid:{}
			}
	}
	console.log("hi")
	const userAvailableBalance = readBalanceStoreUserTotalBalance(userId)! - readBalanceStoreUserLockedBalance(userId)!

	if(!userAvailableBalance){
		console.log(userAvailableBalance)
		//tbd
		//user owned stocks are not found in memory 
		//refresh memory
		//retry and throw error
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
		const ORDERBOOK_STORE_INDEX_length = ORDERBOOK_STORE_INDEX[stockSymbol]?.ask.length!

		if(!ORDERBOOK_STORE[stockSymbol].ask[price] 
			&& 
			(price < ORDERBOOK_STORE_INDEX[stockSymbol]?.ask[0]! || ORDERBOOK_STORE_INDEX_length == 0) 
		){
			//implies if there alredy exist an ASK then just increment its quantity 
			if(ORDERBOOK_STORE[stockSymbol].bid[price]){
				ORDERBOOK_STORE[stockSymbol].bid[price].totalQuantity = ORDERBOOK_STORE[stockSymbol].bid[price].totalQuantity + quantity;
				ORDERBOOK_STORE[stockSymbol].bid[price].remainingQuantity = ORDERBOOK_STORE[stockSymbol].bid[price].remainingQuantity + quantity;
				return res.json(new HttpSuccessResponse(200, true, "Order Placed",ORDERBOOK_STORE[stockSymbol]));
			}
			//if there exist no bid then create one
			else{
				actionCreateBid(userId, stockSymbol, quantity, price);
				return res.json(new HttpSuccessResponse(200, true, "Order Placed",ORDERBOOK_STORE[stockSymbol]));
			}
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

	console.log("creating bid order")

	if(!BALANCE_STORE[userId] || !BALANCE_STORE[userId].balance["inr"]){
		console.log("insufficient balance")
		return false
	}

	if(!ORDERBOOK_STORE[stockSymbol]){
		return false
	}

	//update orderbook
	ORDERBOOK_STORE[stockSymbol].bid[price] = {
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

	//update orderbook index
	addPriceToOrderBookIndex(stockSymbol, "bid", price);

	console.log("orderbook after bid creation",ORDERBOOK_STORE[stockSymbol])

	return true
}

const handlePriceAvailableForOrderTypeLimit = (req:Request, res:Response , userId:string, stockSymbol:string, side:string, type:string, userPrice:number, quantity:number) => {

	console.log("hi 1")
	if(!ORDERBOOK_STORE_INDEX[stockSymbol]) return false;
	if(!BALANCE_STORE[userId] || !BALANCE_STORE[userId].balance["inr"]) return;

	const takerPreviousLockedBalance = readBalanceStoreUserLockedBalance(userId);
	updateBalanceStoreUserLockedBalance(userId, (takerPreviousLockedBalance + (quantity * userPrice)));

	const orderTotalCost = quantity * userPrice;
	let totalCostSpent = 0;

	let fullFilledQuantity = 0;
	let count = 0

	console.log("hi 2")

	console.log("orderbook index",ORDERBOOK_STORE_INDEX[stockSymbol].ask)

	for(const price of ORDERBOOK_STORE_INDEX[stockSymbol].ask){

		console.log("current price in orderbook index",price)

		/*
			IF USER GIVEN PRICE IS NOT AVAILABLE IN ORDERBOOK BUT THERE EXIST FEW ASK PRICES THAT ARE LESS THAN 
			BID , consume all till price > userPrice , and create bid for remaining quantity 
		*/
		if(price > userPrice && quantity > fullFilledQuantity){
			const remainingStockToBuy = (quantity - fullFilledQuantity);
			console.log("creating bid for remaining quantity",remainingStockToBuy)
			actionCreateBid(userId, stockSymbol, remainingStockToBuy, userPrice);

			break;
		}

		if(price > userPrice || quantity == fullFilledQuantity){
			console.log("this rejected at price",price)
			break;
		}
		
		//@ts-ignore
		const askInfo = ORDERBOOK_STORE[stockSymbol].ask[price]!

		if(!ORDERBOOK_STORE[stockSymbol] || !ORDERBOOK_STORE[stockSymbol].ask[price]) return false;
		console.log("hi 3")

		console.log("fullfilled quantity",fullFilledQuantity)

		if(askInfo.remainingQuantity == (quantity - fullFilledQuantity)){
			//tbd
			//add entry in db for fills

			//delete both entries
			delete ORDERBOOK_STORE[stockSymbol].ask[price];

			totalCostSpent = totalCostSpent + (askInfo.remainingQuantity * price);

			//update user stocks
			updateBalancesAndStockForBidOrder(stockSymbol, userId, askInfo.orders[0]?.userId!, askInfo.remainingQuantity, price);

			count++;
			break;
		}

		if(askInfo.remainingQuantity > (quantity - fullFilledQuantity)){

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

			totalCostSpent = totalCostSpent + ((quantity - fullFilledQuantity) * price);

			//update user stocks
			updateBalancesAndStockForBidOrder(stockSymbol, userId, askInfo.orders[0]?.userId!, (quantity - fullFilledQuantity), price); 

			break;
		}

		//update fullfilled quantity
		fullFilledQuantity = fullFilledQuantity + askInfo.remainingQuantity;
		totalCostSpent = totalCostSpent + (askInfo.remainingQuantity * price);

		//delete ask entry from order book
			//tbd add fills db
		delete ORDERBOOK_STORE[stockSymbol].ask[price];

		//add bid entry to the order book
		//partial fullfillment of bid order --> implies requested stock amount > available ask
		if(price == userPrice ){
			const remainingStockToBuy = (quantity - fullFilledQuantity);
			actionCreateBid(userId, stockSymbol, remainingStockToBuy, price);
		}

		if(price  == ORDERBOOK_STORE_INDEX[stockSymbol].ask[ORDERBOOK_STORE_INDEX[stockSymbol].ask.length - 1]){
			const remainingStockToBuy = (quantity - fullFilledQuantity);
			actionCreateBid(userId, stockSymbol, remainingStockToBuy, userPrice);
		}

		//update user stocks
		updateBalancesAndStockForBidOrder(stockSymbol, userId, askInfo.orders[0]?.userId!, askInfo.remainingQuantity, price);
		count++;
	}

	updateBalanceStoreUserLockedBalance(userId, (readBalanceStoreUserLockedBalance(userId) - (orderTotalCost - totalCostSpent)));

	console.log("count",count)
	console.log("orderbook index after",ORDERBOOK_STORE_INDEX[stockSymbol].ask)

	while(count > 0){
		ORDERBOOK_STORE_INDEX[stockSymbol].ask.shift();
		count--;
	}

	console.log(ORDERBOOK_STORE_INDEX[stockSymbol].ask)

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

			//read user balance and stock
			const anuser = askInfo.orders[0]?.userId!
			const anuserBalanceTotal = readBalanceStoreUserTotalBalance(anuser);
			const anuserStocksTotal = readBalanceStoreUserTotalStocks(anuser, stockSymbol)!;

			//@ts-ignore
			BALANCE_STORE[anuser].balance["inr"].total! = anuserBalanceTotal + (askInfo.remainingQuantity * price);
			//@ts-ignore
			BALANCE_STORE[anuser].stock[stockSymbol].total = anuserStocksTotal - askInfo.remainingQuantity;

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