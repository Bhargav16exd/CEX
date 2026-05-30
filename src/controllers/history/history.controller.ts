import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../db/prisma.client.js";
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";
import { MarketType } from "../markets/stock.controller.js";

/*
  FETCH ALL FILLS FOR ALL FILLS HISTORY
*/
export const allFills = async (req:Request, res:Response, next:NextFunction) => {
  try { 
    //@ts-ignore
    let id = req.id 

    const isUserExist = await prisma.user.findUnique({
      where:{
        id:Number(id)
      }
    })

    if(!isUserExist){
      throw new HttpErrorResponse(400, false, "Invalid User ID");
    }

    id = id.toString()

    const fills = await prisma.fill.findMany({
      take:10,
      where:{
        OR:[
          {makerID:id},
          {takerID:id}
        ]
      }
    })

    return res.json(new HttpSuccessResponse(200, true, "Fills", fills));

  } catch (error) {
    console.log(error)
    next(error) 
  }
}

/*
  FETCH ALL ORDERS FOR ALL ORDER HISTORY ACROSS ANY MARKET
*/
export const allOrders = async (req:Request, res:Response, next:NextFunction) => {
  try {
    //@ts-ignore
    let id = req.id 

    const order = await prisma.order.findMany({
      where:{
        userId:id
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

    if(!symbol || Array.isArray(symbol) || !market || Array.isArray(market)){
      throw new HttpErrorResponse(400, false, "Invalid Req Params");
    }

    if(market != MarketType.SPOT  && market != MarketType.PERPETUAL){
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
      take:10,
      where:{
        market,
        symbol,
        OR:[
          {makerID:id},
          {takerID:id}
        ],
      }
    })

    return res.json(new HttpSuccessResponse(200, true, "Fills", fills));

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

    if(!symbol || Array.isArray(symbol) || !market || Array.isArray(market)){
      throw new HttpErrorResponse(400, false, "Invalid Req Params");
    }

    if(market != MarketType.SPOT  && market != MarketType.PERPETUAL){
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
      where:{
        symbol,
        market,
        userId:id
      }
    }) || []

    console.log("here 2")

    return res
    .status(200)
    .json(new HttpSuccessResponse(200, true, "Orders Fetched", order));

  } catch (error) {
    next(error)
  }
}