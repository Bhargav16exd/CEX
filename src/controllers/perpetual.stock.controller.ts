import type { NextFunction, Request, Response } from "express";
import { HttpErrorResponse } from "../utils/http.responses.js";
import { hanldeLongOrders } from "../module/perpetual/order-handler/long.handler.js";
import { hanldeShortOrders } from "../module/perpetual/order-handler/short.handler.js";


export enum MarketOrderSide {
	"LONG" = "LONG",
	"SHORT" = "SHORT"
}

export const Order = async (req:Request ,res:Response, next:NextFunction) => {

	try {
		const {userId ,stockSymbol, type, side, price, quantity} = req.body;

		if(!userId || !stockSymbol || !type || !side || !price || !quantity){
			throw new HttpErrorResponse(400, false, "Invalid Inputs");
		}

		if(side == MarketOrderSide.LONG){
			hanldeLongOrders(req, res, userId ,stockSymbol, type, side, price, quantity);
		}

		if(side == MarketOrderSide.SHORT){
			hanldeShortOrders(req, res, userId ,stockSymbol, type, side, price, quantity);
		}

			
	} catch (error) {
			
	}
}