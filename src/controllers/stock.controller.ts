import type { Request, Response } from "express"
import { HttpErrorResponse, HttpSuccessResponse } from "../utils/http.responses.js"
import BALANCE_STORE from "../memory-store/balance/balance-store.js";
import { ORDERBOOK_STORE } from "../memory-store/orderbook/orderbook-store.js";
import { randomUUID } from "crypto";
import { hanldeOrderSideAsk } from "../modules/order/ask.module.js";

// ------ Order Region Start -----
/*
	stockSymbol 					=> to identify which stock
	side - SELL  | BUY 		=> to identify is order a BUY OR SELL
	type - LIMIT | MARKET => to identity order type
*/

export enum OrderType {
	LIMIT = "LIMIT",
	MARKET = "MARKET"
} 

export enum OrderSide {
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
			hanldeOrderSideAsk(req, res , userId, stockSymbol, side, type, price, quantity);
		}

		if(side == OrderSide.BID){
			hanldeOrderSideBid()
		}

	} catch (error) {
		console.log(error)
	}
}
// ------ Order Region End -----



function hanldeOrderSideBid(){

}