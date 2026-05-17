import type { NextFunction, Request, Response } from "express";
import { HttpErrorResponse } from "../utils/http.responses.js";
import { reduceOnlyGuard } from "../module/perpetual/utils/perp-guards.js";
import { OrderSide } from "../module/perpetual/types/perp-types.js";
import { hanldeLongOrders } from "../module/perpetual/handlers/order-handler/long.handler.js";
import { hanldeShortOrders } from "../module/perpetual/handlers/order-handler/short.handler.js";


export const Order = async (req:Request ,res:Response, next:NextFunction) => {

	try {

		const {userId ,stockSymbol, type, side, price, quantity, collateral, reduceOnly} = req.body;
		
		if(!userId || !stockSymbol || !type || !side || !price || !quantity || !collateral || reduceOnly === undefined){
			throw new HttpErrorResponse(400, false, "Invalid Inputs");
		}

		reduceOnlyGuard(reduceOnly, side, quantity, userId, stockSymbol);

		if(side == OrderSide.LONG){
			return hanldeLongOrders({ req, res, userId, stockSymbol, type, side, price, quantity, collateral, reduceOnly });
		}

		if(side == OrderSide.SHORT){
			return hanldeShortOrders({ req, res, userId, stockSymbol, type, side, price, quantity, collateral, reduceOnly });
		}

			
	} catch (error) {
		next(error)		
	}
}