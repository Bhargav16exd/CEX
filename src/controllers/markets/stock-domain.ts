import { MarketType } from "@bhargav16exdd/cex";
import { prisma } from "../../db/prisma.client.js";
import type { CreateStockInput } from "./stock.types.js";
import { pushToQueue } from "../../utils/engine-client.js";

export const createStock = async ({title, symbol, market}:CreateStockInput) => {

  const stock = await prisma.stock.create({
    data:{
      title,
      market,
      symbol,
    }
  })

  if(!stock){
    throw new Error("Internal Server Error");
  }

  let queueResponse;

  if(market === MarketType.perp){
    queueResponse = await pushToQueue("create_stock_entity",{
      stockSymbol:symbol
    }, MarketType.perp);
  }

  if(market === MarketType.spot){
    queueResponse = await pushToQueue("create_stock_entity",{
      stockSymbol:symbol
    }, MarketType.spot);
  }

  if(queueResponse!.ok == false){
    throw new Error(queueResponse!.error);
  }

  return stock;
}