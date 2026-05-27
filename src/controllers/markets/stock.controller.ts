import type { Request, Response } from "express"
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";
import { createStockValidatorZod, depositBalanceValidatorZod } from "./zod-validations.js";
import { uploadFileToBucket } from "../../utils/upload-files.js";
import { BUCKET_NAME } from "../../constants/contants.js";
import { prisma } from "../../db/prisma.client.js";
import { EngineType } from "../../types/engine.js";
import { pushToQueue } from "../../utils/engine-client.js";
import { tr } from "zod/locales";

export enum MarketType {
  SPOT = "spot",
  PERPETUAL = "perp"
}

const createStock = async (req:Request, res:Response, next:any) => {
  try {
    const { title, symbol, market } = req.body;

    if(!title || !symbol || !market){
      throw new HttpErrorResponse(400, false, "Invalid Inputs");
    }

    const isValidated = createStockValidatorZod.safeParse({
      title,
      symbol,
      market
    })

    const parsedSymbol = symbol.toLowerCase()

    if(!isValidated.success){
      throw new HttpErrorResponse(400, false, "Invalid Input Format");
    }

    const isStockExist = await prisma.stock.findFirst({
      where:{
        symbol:parsedSymbol,
        market
      }
    })

    if(isStockExist){
      throw new HttpErrorResponse(400, false, `Stock ${title} already exist in market ${market}`);
    }


    const stock = await prisma.stock.create({
      data:{
        title,
        market,
        symbol:parsedSymbol
      }
    })

    if(!stock){
      throw new HttpErrorResponse(500, false, "Internal Server Error");
    }

    let queueResponse;

    if(market === MarketType.PERPETUAL){
      queueResponse = await pushToQueue("create_stock_entity",{
        stockSymbol:parsedSymbol
      }, EngineType.PERP);
    }

    if(market === MarketType.SPOT){
      queueResponse = await pushToQueue("create_stock_entity",{
        stockSymbol:parsedSymbol
      }, EngineType.SPOT);
    }

    if(queueResponse!.ok == false){
      throw new HttpErrorResponse(400, false, queueResponse!.error || "Internal Server Error");
    }
    
    return res
    .status(201)
    .json(new HttpSuccessResponse(201, true, "Stock Created", stock));

  } catch (error) {
    console.log(error)
    next(error)
  }
}

const readStocks = async (req:Request, res:Response, next:any) => {
  try {
    const { market } = req.params

    if(!market){
      throw new HttpErrorResponse(400, false, "Invalid Request Params");
    }

    if( market != MarketType.SPOT && market != MarketType.PERPETUAL){
      throw new HttpErrorResponse(400, false, "Invalid Market Type");
    }

    const stocks = await prisma.stock.findMany({
      where:{
        market
      },
      select:{
        title:true,
        symbol:true
      }
    }) || []

    return res
    .status(200)
    .json(new HttpSuccessResponse(200, true, "Data Fetched", stocks));

  } catch (error) {
    next(error)
  }
}

const updateStock = async (req:Request, res:Response, next:any) => {
  try {
    const { id, title, symbol, market} = req.body;

    if(!id){
      throw new HttpErrorResponse(400, false, "Invalid Inputs");
    }

    const filepath = req.file!.path
    const filename = req.file!.filename

    let url = null;

    if(filepath && filename){
      url = await uploadFileToBucket(BUCKET_NAME, filename, filepath);
      await prisma.stock.update({
        where:{
          id,
        },
        data:{
          imageurl:url
        }
      })
    }

    const updatedStock = await prisma.stock.update({
      where:{
        id,
      },
      data:{
        title,
        symbol,
        market
      }
    })

    if(!updatedStock){
      throw new HttpErrorResponse(400, false, "Invalid Stock Id Input")
    }

    return res.json(new HttpSuccessResponse(201, true, "Entity Updated", updatedStock));

  } catch (error) {
    next(error);
  }
}

const deleteStock = async (req:Request, res:Response, next:any) => {
  try {
    const { id } = req.body

    if(!id){
      throw new HttpErrorResponse(400, false, "Invalid Inputs");
    }

    const deletedStock = await prisma.stock.update({
      where:{
        id
      },
      data:{
        deleted:true
      }
    })

    if(!deletedStock){
      throw new HttpErrorResponse(400, false, "")
    }

    return res.json(new HttpSuccessResponse(204, true, "Entity Deleted"));

  } catch (error) {
    next(error);
  }
}

const depositBalance = async(req:Request, res:Response, next:any) => {
  try {
    const {id , balance, marketType } = req.body

    if(!id || !balance || !marketType){
      throw new HttpErrorResponse(400, false, "Invalid Inputs");
    }

    const isValidated = depositBalanceValidatorZod.safeParse({
      id,
      balance,
      marketType
    })

    if(!isValidated){
      throw new HttpErrorResponse(400, false, "Invalid Input Format");
    }

    let queueRes = null

    if(marketType == EngineType.SPOT){
      queueRes = await pushToQueue("update_balance", req.body, EngineType.SPOT);
    }

    if(marketType == EngineType.PERP){
      queueRes = await pushToQueue("update_balance", req.body, EngineType.PERP);
    }

    return res.json(new HttpSuccessResponse(200, true, "Amount Deposited",queueRes?.data!));
    
  } catch (error) {
    next(error)
  }
}

export {
  createStock,
  readStocks,
  updateStock,
  deleteStock,
  depositBalance
}