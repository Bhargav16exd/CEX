import type { NextFunction, Request, Response } from "express";
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";
import { pushToQueue } from "../../utils/engine-client.js";
import { EngineType } from "../../types/engine.js";
import { prisma } from "../../db/prisma.client.js";


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


export const openContracts = async (req:Request, res:Response, next:NextFunction) => {
  try {
    const { marketId, userId } = req.params

    if(!marketId || !userId){ 
      throw new HttpErrorResponse(400, false, "Empty Market Id");
    }

    const market = await prisma.stock.findUnique({
      where:{
        id:Number(marketId)
      }
    })

    if(!market){
      throw new HttpErrorResponse(400, false, "Invalid Market Id");
    }

    const payload = { stockSymbol:market.symbol, userId }
    const queueResponse = await pushToQueue("get_open_contract", payload, EngineType.PERP);

    if(queueResponse.ok == false){
      throw new HttpErrorResponse(400, false, queueResponse.error || "Internal Server Error");
    }
    return res.json(new HttpSuccessResponse(200, true, "Open Positions", queueResponse.data!));

  } catch (error) {
    next(error)
  }
}

export const closedContracts = async (req:Request, res:Response, next:NextFunction) => {
  try {
    
    const { marketId, userId } = req.params

    if(!marketId || !userId){ 
      throw new HttpErrorResponse(400, false, "Empty Market Id");
    }

    const market = await prisma.stock.findUnique({
      where:{
        id:Number(marketId)
      }
    })

    if(!market){
      throw new HttpErrorResponse(400, false, "Invalid Market Id");
    }

    const contracts = await prisma.contracts.findMany({
      where:{
        userId:userId.toString(),
        stockSymbol:market.symbol
      }
    }) || []

    return res
    .status(200)
    .json(new HttpSuccessResponse(200, true, "Fetch Success", contracts));

  } catch (error) {
    next(error)
  }
}