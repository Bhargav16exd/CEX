import type { NextFunction, Request, Response } from "express";
import { HttpErrorResponse, HttpSuccessResponse } from "../utils/http.responses.js";
import { pushToQueue } from "../utils/engine-client.js";
import { EngineType } from "../types/engine.js";

export const Order = async (req:Request ,res:Response, next:NextFunction) => {
	try {
		const {userId ,stockSymbol, type, side, price, quantity, collateral, reduceOnly} = req.body;
		
		if(!userId || !stockSymbol || !type || !side || !price || !quantity || !collateral || reduceOnly === undefined){
			throw new HttpErrorResponse(400, false, "Invalid Inputs");
		}
    const queueResponse = await pushToQueue("create_order", req.body, EngineType.PERP);
			
    if(queueResponse.ok == false){
      throw new HttpErrorResponse(400, false, queueResponse.error || "Internal Server Error");
    }
    return res.json(new HttpSuccessResponse(200, true, "Order Placed", queueResponse.data!));
	} catch (error) {
		next(error)		
	}
}