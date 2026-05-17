import { addPriceToOrderBookIndex, ORDERS, PERPETUAL_ORDERBOOK_STORE, updateOrderFullFilledQuantity } from "../memory/orderbook/prep-orderbook.js";

export const actionCreateLong = (userId:string, stockSymbol:string, userPrice:number, quantity:number, orderId:string) => {

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

export const actionCreateShort = (userId:string, stockSymbol:string, userPrice:number, quantity:number, orderId:string) => {

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

export const updateOrderOfMakers = (userIds: Record<string,Array<string>>, quantity: number) => {
	/*
	------- INPUT INFO -------	
	quantity : input quantity is remaining quantitiy left for that price bracket
	userIds : { <userId>: [orderId1, orderId2]  , <userId2>: [orderId3, orderId4] }
	--------------------------
	*/

	/*
   ------- INFO -------
		->TRAVESRSING OVER EVER ORDER AT A PARTICULAR PRICE
		->UDPATE FULLFILLED STATUS
	 --------------------
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