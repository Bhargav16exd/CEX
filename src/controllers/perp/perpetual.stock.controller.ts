import type { NextFunction, Request, Response } from "express";
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";
import { pushToQueue } from "../../utils/engine-client.js";
import { prisma } from "../../db/prisma.client.js";
import { MarketType } from "@cex/shared";

/*
  ---------- ORDERS SECTION --------
  ----------------------------------
*/

export const Order = async (req:Request ,res:Response, next:NextFunction) => {
	try {
    //@ts-ignore
    const userId = req?.id
		const {stockSymbol, type, side, price, quantity, collateral, reduceOnly} = req.body;
    
		
		if(!userId || !stockSymbol || !type || !side || !price || !quantity){
			throw new HttpErrorResponse(400, false, "Invalid Inputs");
		}
    const queueResponse = await pushToQueue("create_order", {...req.body, userId}, MarketType.perp);
			
    if(queueResponse.ok == false){
      throw new HttpErrorResponse(400, false, queueResponse.error || "Internal Server Error");
    }
    return res.json(new HttpSuccessResponse(200, true, "Order Placed", queueResponse.data!));
    
	} catch (error) {
		next(error)		
	}
}

export const deleteOrder = async (req:Request, res:Response, next:NextFunction) => {
  try {
    const {userId , orderId} = req.body;
    
    if(!userId || !orderId){
      throw new HttpErrorResponse(400, false, "Invalid Inputs");
    }

    const queueResponse = await pushToQueue("cancel_order", req.body, MarketType.perp);
      
    if(queueResponse.ok == false){
      throw new HttpErrorResponse(400, false, queueResponse.error || "Internal Server Error");
    }
    
    return res.json(new HttpSuccessResponse(204, true, "Order Canceled",queueResponse.data!));

  } catch (error) {
    next(error)
  }
}

export const OpenOrders = async (req:Request, res:Response, next:NextFunction) => {
  try {
    //@ts-ignore
    const id = req.id;
    const {symbol} = req.params

    const queueResponse = await pushToQueue("get_open_order", {id, symbol}, MarketType.perp);
      
    if(queueResponse.ok == false){
      throw new HttpErrorResponse(400, false, queueResponse.error || "Internal Server Error");
    }
    
    return res.json(new HttpSuccessResponse(200, true, "Open Orders",queueResponse.data!));

  } catch (error) {
    next(error)
  }
}

/*
  ------- CONTRACTS SECTION --------
  ----------------------------------
*/

export const openContracts = async (req:Request, res:Response, next:NextFunction) => {
  try {
    //@ts-ignore
    const id = req.id
    const { symbol } = req.params

    if(!symbol || !id){ 
      throw new HttpErrorResponse(400, false, "Empty Market Id");
    }
    const payload = { symbol, id }
    const queueResponse = await pushToQueue("get_open_contract", payload, MarketType.perp);

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
    
    const { symbol, userId } = req.params

    if(!symbol || !userId){ 
      throw new HttpErrorResponse(400, false, "Empty Market Id");
    }

    const contracts = await prisma.contracts.findMany({
      where:{
        userId:userId.toString(),
        symbol
      }
    }) || []

    return res
    .status(200)
    .json(new HttpSuccessResponse(200, true, "Fetch Success", contracts));

  } catch (error) {
    next(error)
  }
}

export const depth = async (req:Request, res:Response, next:NextFunction) => {
  try {
    const { stockSymbol } = req.params

    if(!stockSymbol){
      throw new HttpErrorResponse(400, false, "Invalid Params");
    }
    
    const queueResponse = await pushToQueue("get_depth", {stockSymbol}, MarketType.perp);

    if(queueResponse.ok == false){
      throw new HttpErrorResponse(400, false, queueResponse.error || "Internal Server Error");
    }

    //@ts-ignore
    const orderbook = queueResponse.data.orderbook
    //@ts-ignore
    const orderbookIndex = queueResponse.data.orderbookIndex

    const returnPayload = depthHelper(orderbook, orderbookIndex);
    
    return res
    .status(200)
    .json(new HttpSuccessResponse(200, true, "Success", { ...returnPayload, updateId:orderbook.updateId}));

  } catch (error) {
    next(error)
  }
}

interface StockSpecificOrderbookIndexStoreType {
  short:number[],
  long:number[]
}

interface StockSpecificOrderbookStoreType {
  short:ShortType,
  long:LongType
}

interface ShortType {
  [price :string]:TransactionEntityType
}

interface LongType {
  [price :string]:TransactionEntityType
}

interface TransactionEntityType {
  totalQuantity:number;
  remainingQuantity:number;
}

const depthHelper = (orderbook:StockSpecificOrderbookStoreType, orderbookIndex:StockSpecificOrderbookIndexStoreType) => {
  const bids :any= []
  const asks :any= [];

  orderbookIndex.long.forEach((price)=>{
    const item = [] as any;
    item.push(price);
    item.push(orderbook.long[`${price}`]?.remainingQuantity)
    bids.unshift(item)
  })

  orderbookIndex.short.forEach((price)=>{
    const item = [] as any;
    item.push(price);
    item.push(orderbook.short[`${price}`]?.remainingQuantity)
    asks.push(item)
  })

  return {
    bids,
    asks
  }
}