import type { Request, Response } from "express"
import { addPriceToOrderBookIndex, ORDERBOOK_STORE, ORDERBOOK_STORE_INDEX } from "../../memory-store/orderbook/orderbook-store.js"
import BALANCE_STORE, { readBalanceStoreUserLockedStocks, readBalanceStoreUserTotalBalance, readBalanceStoreUserTotalStocks, updateBalanceStoreUserLockedStocks, updateBalanceStoreUserTotalBalance, updateBalanceStoreUserTotalStocks } from "../../memory-store/balance/balance-store.js"
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js"
import { Order, OrderType } from "../../controllers/stock.controller.js"

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
			actionCreateAsk(userId, stockSymbol, quantity ,price);
			return res.json(new HttpSuccessResponse(200, true, "Order Placed",ORDERBOOK_STORE[stockSymbol]));
		}

		/*
			SCENARIO 2 - USER WANTS TO SELL/ASK && BID IS AVAILABLE , depending on quantity available for sale we perform actions
		  ACTION - WE PUT ASK IN ORDERBOOK OR DELETE WHOLE BID IF REQUIRED
		*/

		handlePriceAvailableForOrder(req, res, userId, stockSymbol, side, type, price, quantity);
	}

	if(type == OrderType.MARKET){
		handleOrderTypeMarket(req, res, userId, stockSymbol, side, type , price, quantity);
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

	//update orderbook index
	addPriceToOrderBookIndex(stockSymbol, "ask", price);

	return true
}


const handlePriceAvailableForOrder = (req:Request, res:Response , userId:string, stockSymbol:string, side:string, type:string, userPrice:number, quantity:number) => {

	if(!ORDERBOOK_STORE[stockSymbol] || !ORDERBOOK_STORE[stockSymbol].bid[userPrice]) return;
	if(!BALANCE_STORE[userId] || !BALANCE_STORE[userId].stock[stockSymbol]) return;
	if(!ORDERBOOK_STORE_INDEX[stockSymbol]?.bid) return;
	let fullFilledQuantity = 0;
	let count = 0;


	for(let i = ORDERBOOK_STORE_INDEX[stockSymbol].bid.length - 1 ; i >= 0  ; i--){
		
		const price = ORDERBOOK_STORE_INDEX[stockSymbol].bid[i]!;

		if( price < userPrice || fullFilledQuantity == quantity){
			break;
		}

		const bidInfo = ORDERBOOK_STORE[stockSymbol].bid[price]

		if(!bidInfo) return
		if(!ORDERBOOK_STORE[stockSymbol] || !ORDERBOOK_STORE[stockSymbol].bid[price]) return;


		//complete fullfillment of ask order
		if(bidInfo.remainingQuantity == (quantity - fullFilledQuantity)){
			//tbd
			//add entry in db for fills
			delete ORDERBOOK_STORE[stockSymbol].bid[price];

			//partial fullfillment of ask order --> implies requested amount > available bids
			const previousTotalStocks = readBalanceStoreUserTotalStocks(userId, stockSymbol)!;
			
			//update user balances for sold stocks
			const oldInrBalance:any = BALANCE_STORE[userId]?.balance["inr"]?.total

			updateBalanceStoreUserTotalStocks(userId, stockSymbol, (previousTotalStocks - bidInfo.remainingQuantity));
			updateBalanceStoreUserTotalBalance(userId, (oldInrBalance + (price * bidInfo.remainingQuantity)));

			count++;
			break;
		}

		//complete fullfillment of ask order
		if(bidInfo.remainingQuantity > (quantity - fullFilledQuantity)){

			const previousTotalStocks =  readBalanceStoreUserTotalStocks(userId, stockSymbol)!

			//lock stock for transaction
			const previousLockedStocks = readBalanceStoreUserLockedStocks(userId, stockSymbol)!
			BALANCE_STORE[userId].stock[stockSymbol].locked = (previousLockedStocks + (quantity - fullFilledQuantity));


			//reduce quantity in orderbook 
			const previousRemainingQuantity = ORDERBOOK_STORE[stockSymbol].bid[price].remainingQuantity
			ORDERBOOK_STORE[stockSymbol].bid[price].remainingQuantity = previousRemainingQuantity - (quantity - fullFilledQuantity)

			//add order in orderbook
			ORDERBOOK_STORE[stockSymbol].bid[price].orders.push({
				userId,
				quantity:bidInfo.totalQuantity,
				filledQuantity:quantity,
				orderId:"1",
				createdAt: new Date().toISOString()
			})

			//after all stocks are sold , reduce total stock
			BALANCE_STORE[userId].stock[stockSymbol].total = (previousTotalStocks - (quantity - fullFilledQuantity));
			BALANCE_STORE[userId].stock[stockSymbol].locked = ( BALANCE_STORE[userId].stock[stockSymbol].locked - (quantity - fullFilledQuantity));

			//update INR balance
			const oldInrBalance = BALANCE_STORE[userId].balance["inr"]?.total
			//@ts-ignore
			BALANCE_STORE[userId].balance["inr"].total = ( oldInrBalance + (price * (quantity - fullFilledQuantity)))

			break;
		}

		//update fullfilled quantity
		fullFilledQuantity = fullFilledQuantity + bidInfo.remainingQuantity;

		//delete bid entry from order book 
			//tbd add fills db
		delete ORDERBOOK_STORE[stockSymbol].bid[price]


		if(price == userPrice){
			//add ask entry to the order book
			const remainingStocksToSell = (quantity - fullFilledQuantity);
			actionCreateAsk(userId, stockSymbol, remainingStocksToSell, price)
		}

		//partial fullfillment of ask order --> implies requested amount > available bids
		const previousTotalStocks = readBalanceStoreUserTotalStocks(userId, stockSymbol)!;
		
		//update user balances for sold stocks
		const oldInrBalance:any = BALANCE_STORE[userId]?.balance["inr"]?.total 

		/*
			AS PARTIAL STOCKS ARE asked
			-> LOCKED STOCKS ARE HANDLED BY FUNCTION ITSELF
			AND PARTIAL STOCKS ARE SOLD
			-> WE NEED TO UPDATE JUST THE BALANCE AS SALE VALUE
		*/
		updateBalanceStoreUserTotalStocks(userId, stockSymbol, (previousTotalStocks - bidInfo.remainingQuantity));
		updateBalanceStoreUserTotalBalance(userId, (oldInrBalance + (price * bidInfo.remainingQuantity)));

		count++;
	}

	while(count > 0){
		ORDERBOOK_STORE_INDEX[stockSymbol].bid.pop();
		count--;
	}
	
	return res.json(new HttpSuccessResponse(200, true, "Order Placed", ORDERBOOK_STORE[stockSymbol]));
}

const handleOrderTypeMarket = (req:Request, res:Response , userId:string, stockSymbol:string, side:string, type:string, userPrice:number, quantity:number) => {

	if(!ORDERBOOK_STORE_INDEX[stockSymbol]) return;
	if(!ORDERBOOK_STORE[stockSymbol]) return;
	if(!BALANCE_STORE[userId] || !BALANCE_STORE[userId].balance["inr"] || !BALANCE_STORE[userId].stock[stockSymbol]) return
	
	let fullFilledQuantity = 0;
	let count = 0;

	for(let i = ORDERBOOK_STORE_INDEX[stockSymbol].bid.length - 1 ; i >= 0  ; i--){

		if(fullFilledQuantity == quantity){
			break;
		}

		//get highest price bid from index 
		const price = ORDERBOOK_STORE_INDEX[stockSymbol].bid[i]!;

		if(!ORDERBOOK_STORE[stockSymbol].bid[price]) return;

		//based on price recived -> fetch full order details
		const bidInfo = ORDERBOOK_STORE[stockSymbol].bid[price]!

		if(bidInfo.remainingQuantity == (quantity - fullFilledQuantity)){
			
			//add bid quantity 
			fullFilledQuantity = fullFilledQuantity + bidInfo.remainingQuantity

			//delete that bid from order book
			delete ORDERBOOK_STORE[stockSymbol].bid[price]

			//now as order is proccessed read user stock and balance && update user stock and balance
			//read
			const userBalanceTotal = readBalanceStoreUserTotalBalance(userId)
			const userStocksTotal = readBalanceStoreUserTotalStocks(userId, stockSymbol)!

			//update
			BALANCE_STORE[userId].balance["inr"].total = userBalanceTotal + (price * bidInfo.remainingQuantity);
			BALANCE_STORE[userId].stock[stockSymbol].total = userStocksTotal - bidInfo.remainingQuantity;
			count++;
			break;
		}

		if(bidInfo.remainingQuantity > (quantity - fullFilledQuantity)){
			//update store
			ORDERBOOK_STORE[stockSymbol].bid[price].remainingQuantity = bidInfo.remainingQuantity - (quantity - fullFilledQuantity);

			//add order 
			ORDERBOOK_STORE[stockSymbol].bid[price].orders.push({
				userId,
				quantity:bidInfo.totalQuantity,
				filledQuantity:(quantity - fullFilledQuantity),
				orderId:"1",
				createdAt: new Date().toISOString()
			})

			//read and update balances and stock of user

			//read
			const userBalanceTotal = readBalanceStoreUserTotalBalance(userId);
			const userStocksTotal = readBalanceStoreUserTotalStocks(userId, stockSymbol)!;

			//update
			BALANCE_STORE[userId].balance["inr"].total = userBalanceTotal + (price * (quantity - fullFilledQuantity));
			BALANCE_STORE[userId].stock[stockSymbol].total = userStocksTotal - (quantity - fullFilledQuantity);

			break;
		}

		/*
			SECTION HANLDES THAT , IF A SINGLE BID IS NOT ABLE TO FULL FILL THEN BELOW HAPPENS
		*/
		//add bid quantity 
		fullFilledQuantity = fullFilledQuantity + bidInfo.remainingQuantity

		//delete that bid from order book
		delete ORDERBOOK_STORE[stockSymbol].bid[price]

		//now as order is proccessed read user stock and balance && update user stock and balance
		//read
		const userBalanceTotal = readBalanceStoreUserTotalBalance(userId)
		const userStocksTotal = readBalanceStoreUserTotalStocks(userId, stockSymbol)!

		//update
		BALANCE_STORE[userId].balance["inr"].total = userBalanceTotal + (price * bidInfo.remainingQuantity);
		BALANCE_STORE[userId].stock[stockSymbol].total = userStocksTotal - bidInfo.remainingQuantity;
		count ++;
	}

	while(count > 0){
		ORDERBOOK_STORE_INDEX[stockSymbol].bid.pop();
		count --;
	}

	if(count == ORDERBOOK_STORE_INDEX[stockSymbol].bid.length){
		return res.json(new HttpSuccessResponse(200, true, `Pratial Order Completed [Remaining Amount] : ${quantity-fullFilledQuantity}`, ORDERBOOK_STORE[stockSymbol]));
	}

	return res.json(new HttpSuccessResponse(200, true, "Order Placed", ORDERBOOK_STORE[stockSymbol]));
}
