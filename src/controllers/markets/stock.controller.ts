import type { Request, Response } from "express"
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";
import { createStockValidatorZod, depositBalanceValidatorZod } from "./zod-validations.js";
import { uploadFileToBucket } from "../../utils/upload-files.js";
import { BUCKET_NAME } from "../../constants/contants.js";
import { prisma } from "../../db/prisma.client.js";
import { MarketType } from "@bhargav16exdd/cex"; 
import { createStock as createStockEntity } from "./stock-domain.js";

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
  
    const parsedSymbol = symbol.toLowerCase() as string;
  
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

    const stock = await createStockEntity({title, symbol:parsedSymbol, market});
    
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

    if( market != MarketType.spot && market != MarketType.perp){
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

export {
  createStock,
  readStocks,
  updateStock,
  deleteStock
}