import dotenv from "dotenv"
import { prisma } from "../db/prisma.client.js";
import bcrypt from "bcrypt"
import { SALT_ROUNDS } from "../controllers/user/user.controller.js";
import { execSync } from "child_process";
import { handleQueueError, pushToQueue } from "./engine-client.js";
import { MarketType } from "@bhargav16exdd/cex";
import { ADMIN_USER_BALANCE, ADMIN_USER_STOCKS, PERP_MARKET_STOCKS, SPOT_MARKET_STOCKS } from "../constants/contants.js";
import { createStock } from "../controllers/markets/stock-domain.js";

dotenv.config();

/*
  --- SECTION : INIT ACCOUNTS ---- 
*/
async function initAdminUser(){

  const username = process.env.ADMIN_USERNAME!
  const password = process.env.ADMIN_PASSWORD!

  userHelper(username, password, "ADMIN", ADMIN_USER_BALANCE, ADMIN_USER_STOCKS);

  console.log("[INIT] ADMIN ACCOUNT CREATED");
}

async function initSeederUser(){

  const username = process.env.SEEDER_USERNAME!
  const password = process.env.SEEDER_PASSWORD!

  userHelper(username, password, "SEEDER", ADMIN_USER_BALANCE, ADMIN_USER_STOCKS);

  console.log("[INIT] SEEDER ACCOUNT CREATED");
}

async function initAskBotUser(){
  const username = process.env.ASK_BOT_USERNAME!
  const password = process.env.ASK_BOT_PASSWORD!

  userHelper(username, password, "ASK_BOT", 0, ADMIN_USER_STOCKS);

  console.log("[INIT] ASK BOT ACCOUNT CREATED");
}

async function initBidBotUser(){
  const username = process.env.BID_BOT_USERNAME!
  const password = process.env.BID_BOT_PASSWORD!

  userHelper(username, password, "BID_BOT", ADMIN_USER_BALANCE, 0);

  console.log("[INIT] BID BOT ACCOUNT CREATED");
}

const userHelper = async (username:string, password:string, userType:string, balance:number, stocks:number) => {

  const existingUser = await prisma.user.findFirst({
    where:{
      username
    }
  })

  if(existingUser){
    console.log(`[INIT] EXISTING ${userType} DATA DETECTED. SKIPPING ${userType} ACCOUNT CREATION`)
    return
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data:{
      username,
      password:hashedPassword,
      balance:0,
      role: userType == "ADMIN" ? "admin" : "client"
    }
  })

  const queueResponseSpot = await pushToQueue("init_user_balance", {
    id:user.id,
    balance,
    stocks
  }, MarketType.spot)

  handleQueueError(queueResponseSpot);

  const queueResponsePerp = await pushToQueue("init_user_balance", {
    id:user.id,
    balance
  }, MarketType.perp)

  handleQueueError(queueResponsePerp);
}

/*
  --- SECTION : INIT MARKETS ---- 
*/
async function initMarketListed(){

  const spotStocks = SPOT_MARKET_STOCKS;
  const perpStock = PERP_MARKET_STOCKS;

  //init spot market
  spotStocks.forEach(async({title, symbol})=>{
    const isStockExist = await prisma.stock.findFirst({
      where:{
        symbol:symbol!.toLocaleLowerCase(),
        market:MarketType.spot
      }
    })
    if(isStockExist){
      console.log(`[INIT] Stock ${symbol} already exist in market ${MarketType.spot}. Skipping...`);
      return;
    }
    await createStock({title:title!, symbol:symbol!.toLocaleLowerCase(), market:MarketType.spot});

    console.log(`[INIT] ${symbol} ${MarketType.spot}`);
  })

  //init spot market
  perpStock.forEach(async({title, symbol})=>{
    const isStockExist = await prisma.stock.findFirst({
      where:{
        symbol:symbol!.toLocaleLowerCase(),
        market:MarketType.perp
      }
    })
    if(isStockExist){
      console.log(`[INIT] Stock ${symbol} already exist in market ${MarketType.perp}. Skipping...`);
      return;
    }
    await createStock({title:title!, symbol:symbol!.toLocaleLowerCase(), market:MarketType.perp});
    console.log(`[INIT] ${symbol} ${MarketType.perp}`);
  })

}

/*
  --- SECTION : INIT MIGRATIONS ---- 
*/
function initMigrations(){
  execSync("npx prisma migrate dev")
  console.log("PRISMA MIGRATIONS APPLIED")
}

export {
  initAdminUser,
  initSeederUser,
  initAskBotUser,
  initBidBotUser,
  initMigrations,
  initMarketListed
}