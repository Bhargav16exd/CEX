import type { Request, Response } from "express"
import { HttpErrorResponse, HttpSuccessResponse } from "../utils/http.responses.js"
import { pushToQueue } from "../utils/engine-client.js";


// ------ Order Region Start -----
/*
	stockSymbol 			=> to identify which stock
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

export const Order = async (req:Request, res:Response) => {
	try {	
		const {userId, stockSymbol, side, type, price, quantity} = req.body

		if(!userId || !stockSymbol || !side || !type || !price || !quantity ){
			throw new HttpErrorResponse(400, false, "Invalid Inputs");
		}
		
		if(side == OrderSide.ASK){
			const ress = await pushToQueue("create_order",req.body)
			console.log("res",ress)
			//hanldeOrderSideAsk(req, res , userId, stockSymbol, side, type, price, quantity);
		}

		if(side == OrderSide.BID){
			//hanldeOrderSideBid(req, res , userId, stockSymbol, side, type, price, quantity);
		}

	} catch (error) {
		console.log(error)
	}
}
// ------ Order Region End -----


