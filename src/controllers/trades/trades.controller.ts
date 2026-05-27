import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../db/prisma.client.js";
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";

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

export const orders = async (req:Request, res:Response, next:NextFunction) => {
  try {
    
    const { marketId } = req.params

    if(!marketId){
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

    const order = await prisma.order.findMany({
      where:{
        stockSymbol:market.symbol
      }
    }) || []

    return res
    .status(200)
    .json(new HttpSuccessResponse(200, true, "Orders Fetched", order));

  } catch (error) {
    next(error)
  }
}