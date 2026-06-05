import type { NextFunction, Request, Response } from "express"
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";
import { handleQueueError, pushToQueue } from "../../utils/engine-client.js";
import { MarketType } from "@cex/shared";
import { prisma } from "../../db/prisma.client.js";

// ------ Order Region Start -----
/*
	stockSymbol 			=> to identify which stock
	side - SELL  | BUY 		=> to identify is order a BUY OR SELL
	type - LIMIT | MARKET => to identity order type
*/

export const Order = async (req:Request, res:Response, next:any) => {
	try {	

    //@ts-ignore
    const  userId = req?.id
		const { stockSymbol, side, type, price, quantity} = req.body

		if(!userId || !stockSymbol || !side || !type || !price || !quantity ){
			throw new HttpErrorResponse(400, false, "Invalid Inputs");
		}

		const queueResponse = await pushToQueue("create_order", {...req.body, userId}, MarketType.spot);

		if(queueResponse.ok == false){
			throw new HttpErrorResponse(400,false, queueResponse.error || "Internal Server Errror");
		}
		
		return res.json(new HttpSuccessResponse(200,true,"Order Placed", queueResponse.data!))!

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
    
    const queueResponse = await pushToQueue("get_depth", {stockSymbol}, MarketType.spot);

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

export const OpenOrders = async (req:Request, res:Response, next:NextFunction) => {
  try {
    //@ts-ignore
    const id = req.id;
    const {symbol} = req.params
    const {count, offset} = req.query

    const queueResponse = await pushToQueue("get_open_order", { id, symbol, count, offset }, MarketType.spot);
      
    if(queueResponse.ok == false){
      throw new HttpErrorResponse(400, false, queueResponse.error || "Internal Server Error");
    }
    
    return res.json(new HttpSuccessResponse(200, true, "Open Orders",queueResponse.data!));

  } catch (error) {
    next(error)
  }
}

export const Stocks = async (req:Request, res:Response, next:NextFunction) => {
  try {

    //@ts-ignore
    const {symbol, quantity, userId} = req.body

    if(!symbol || !quantity || !userId){
      throw new HttpErrorResponse(400, false, "Invalid Inputs");
    }

    const queueResponse = await pushToQueue("update_user_stock",{userId, symbol, quantity}, MarketType.spot);

    handleQueueError(queueResponse);

    return res.json(new HttpSuccessResponse(200, true, "Stocks Updated", queueResponse.data ?? {}))

  } catch (error) {
    next(error);
  }
}
export const ReadStocks = async (req:Request, res:Response, next:NextFunction) => {
  try {

    //@ts-ignore
    const userId = req.id
    const { symbol } = req.params
    
    if(!symbol || !userId){
      throw new HttpErrorResponse(400, false, "Invalid Inputs");
    }

    const queueResponse = await pushToQueue("get_user_stock_quantity",{userId, symbol}, MarketType.spot);

    handleQueueError(queueResponse);

    return res.json(new HttpSuccessResponse(200, true, "Stocks", queueResponse.data ?? {}))

  } catch (error) {
    next(error);
  }
}

interface StockSpecificOrderbookIndexStoreType {
  bid:number[],
  ask:number[]
}

interface StockSpecificOrderbookStoreType {
  bid:BidType,
  ask:AskType
}

interface BidType {
  [price :string]:TransactionEntityType
}

interface AskType {
  [price :string]:TransactionEntityType
}

interface TransactionEntityType {
  totalQuantity:number;
  remainingQuantity:number;
}

const depthHelper = (orderbook:StockSpecificOrderbookStoreType, orderbookIndex:StockSpecificOrderbookIndexStoreType) => {

  const bids :any= []
  const asks :any= [];

  console.log(orderbookIndex)

  orderbookIndex.bid.forEach((price)=>{
    const item = [] as any;
    item.push(price);
    item.push(orderbook.bid[`${price}`]?.remainingQuantity)
    bids.unshift(item)
  })

  orderbookIndex.ask.forEach((price)=>{
    const item = [] as any;
    item.push(price);
    item.push(orderbook.ask[`${price}`]?.remainingQuantity)
    asks.push(item)
  })

  return {
    bids,
    asks
  }
}


// ------ Order Region End -----


