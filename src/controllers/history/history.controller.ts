import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../db/prisma.client.js";
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";
import { MarketType } from "@cex/shared";

/*
  FETCH ALL FILLS FOR ALL FILLS HISTORY
*/
export const allFills = async (req:Request, res:Response, next:NextFunction) => {
  try { 
    //@ts-ignore
    let id = req.id
    const {count, offset} = req.query; 
    const {market} = req.params

    if(!market || Array.isArray(market)){
      throw new HttpErrorResponse(400, false, "Invalid Req Params");
    }

    if(market != MarketType.spot  && market != MarketType.perp){
      throw new HttpErrorResponse(400, false, "Invalid Market Type");
    }

    id = id.toString()

    const fills = await prisma.fill.findMany({
      skip:Number(offset) ?? 0,
      take:Number(count) ?? 10,
      where:{
        OR:[
          {makerID:id},
          {takerID:id}
        ],
        market
      }
    })

    return res.json(new HttpSuccessResponse(200, true, "Fills", buildFillsPayload(fills, id)));

  } catch (error) {
    next(error) 
  }
}

/*
  FETCH ALL ORDERS FOR ALL ORDER HISTORY ACROSS ANY MARKET
*/
export const allOrders = async (req:Request, res:Response, next:NextFunction) => {
  try {
    //@ts-ignore
    let id = req.id ;
    const {count, offset} = req.query;

    const {market} = req.params

    if(!market || Array.isArray(market)){
      throw new HttpErrorResponse(400, false, "Invalid Req Params");
    }

    if(market != MarketType.spot  && market != MarketType.perp){
      throw new HttpErrorResponse(400, false, "Invalid Market Type");
    }

    const order = await prisma.order.findMany({
      skip:Number(offset) ?? 0,
      take:Number(count) ?? 10,
      where:{
        userId:id,
        market
      },
      select:{
        symbol:true,
        side:true,
        type:true,
        price:true,
        quantity:true,
        status:true,
        createdAt:true
      }
    }) || []

    return res
    .status(200)
    .json(new HttpSuccessResponse(200, true, "Orders Fetched", order));

  } catch (error) {
    next(error)
  }
}

/* 
  MARKET SPECIFIC FILLS
*/
export const fills = async (req:Request, res:Response, next:NextFunction) => {
  try { 
    //@ts-ignore
    let id = req.id 
    const { symbol, market } = req.params; 
    const {count, offset} = req.query


    if(!symbol || Array.isArray(symbol) || !market || Array.isArray(market)){
      throw new HttpErrorResponse(400, false, "Invalid Req Params");
    }

    if(market != MarketType.spot  && market != MarketType.perp){
      throw new HttpErrorResponse(400, false, "Invalid Market Type");
    }

    const stock = await prisma.stock.findFirst({
      where:{
        symbol
      }
    })

    if(!stock){
      throw new HttpErrorResponse(400, false, "Invalid Stock Symbol");
    }

    id = id.toString()

    const fills = await prisma.fill.findMany({
      skip:Number(offset) ?? 0,
      take:Number(count) ?? 10,
      where:{
        market,
        symbol,
        OR:[
          {makerID:id},
          {takerID:id}
        ],
      }
    })

    return res.json(new HttpSuccessResponse(200, true, "Fills", buildFillsPayload(fills, id)));

  } catch (error) {
    console.log(error)
    next(error) 
  }
}

/* 
  MARKET SPECIFIC ORDERS
*/
export const orders = async (req:Request, res:Response, next:NextFunction) => {
  try {
    //@ts-ignore
    let id = req.id 
    const { symbol, market } = req.params; 
    const {count, offset} = req.query;

    if(!symbol || Array.isArray(symbol) || !market || Array.isArray(market)){
      throw new HttpErrorResponse(400, false, "Invalid Req Params");
    }

    if(market != MarketType.spot  && market != MarketType.perp){
      throw new HttpErrorResponse(400, false, "Invalid Market Type");
    }

    const stock = await prisma.stock.findFirst({
      where:{
        symbol
      }
    })

    if(!stock){
      throw new HttpErrorResponse(400, false, "Invalid Stock Symbol");
    }

    const order = await prisma.order.findMany({
      skip:Number(offset) ?? 0,
      take:Number(count) ?? 10,
      where:{
        symbol,
        market,
        userId:id
      },
      select:{
        symbol:true,
        side:true,
        type:true,
        price:true,
        quantity:true,
        status:true,
        createdAt:true
      }
    }) || []

    return res
    .status(200)
    .json(new HttpSuccessResponse(200, true, "Orders Fetched", order));

  } catch (error) {
    next(error)
  }
}

type Fills = {
  takerID: string;
  makerOrderID: string;
  makerID: string;
  takerOrderID: string;
  quantity: number;
  symbol:string;
  market: string;
  price:number;
  makerSide:string;
  takerSide:string;
  createdAt:Date;
}

export const buildFillsPayload = (fills:Array<Fills>, userId:string) =>{
  const trimmedPayload = fills.map((fill)=>{
    const {role, side} = getUserSideAndRole(fill, userId);
    return {
      symbol:fill.symbol,
      side,
      price:fill.price,
      quantity:fill.quantity,
      role,
      createdAt:fill.createdAt
    }
  })
  return trimmedPayload
}

const getUserSideAndRole = (fill:Fills, userId:string) =>{
  let role = "";
  let side = "";
  
  if(Number(fill.makerID) === Number(userId)){
    role = "Maker" 
    side = fill.makerSide 
  }
  else if(Number(fill.takerID) === Number(userId)){
    role = "Taker"
    side = fill.takerSide
  }

  return {
    role,side
  }
}