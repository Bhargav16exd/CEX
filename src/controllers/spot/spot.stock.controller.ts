import type { Request, Response } from "express"
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";
import { pushToQueue } from "../../utils/engine-client.js";
import { EngineType } from "../../types/engine.js";

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

export const Order = async (req:Request, res:Response, next:any) => {
	try {	
		const {userId, stockSymbol, side, type, price, quantity} = req.body

		if(!userId || !stockSymbol || !side || !type || !price || !quantity ){
			throw new HttpErrorResponse(400, false, "Invalid Inputs");
		}

		const queueResponse = await pushToQueue("create_order", req.body, EngineType.SPOT);

		if(queueResponse.ok == false){
			throw new HttpErrorResponse(400,false, queueResponse.error || "Internal Server Errror");
		}
		
		return res.json(new HttpSuccessResponse(200,true,"Order Placed", queueResponse.data!))!

	} catch (error) {
		next(error)
	}
}
// ------ Order Region End -----


