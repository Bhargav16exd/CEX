import dotenv from "dotenv"
import { prisma } from "../db/prisma.client.js";
import bcrypt from "bcrypt"
import { SALT_ROUNDS } from "../controllers/user/user.controller.js";
import { execSync } from "child_process";
import { handleQueueError, pushToQueue } from "./engine-client.js";
import { MarketType } from "@bhargav16exdd/cex";
import { ADMIN_USER_BALANCE, ADMIN_USER_STOCKS } from "../constants/contants.js";

dotenv.config();

async function initAdminUser(){

  const username = process.env.ADMIN_USERNAME!
  const password = process.env.ADMIN_PASSWORD!

  const existingUser = await prisma.user.findFirst({
    where:{
      username
    }
  })

  if(existingUser){
    console.log("EXISTING ADMIN DATA DETECTED. SKIPPING ADMIN ACCOUNT CREATION")
    return
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data:{
      username,
      password:hashedPassword,
      balance:0,
      role:"admin"
    }
  })

  const queueResponseSpot = await pushToQueue("init_user_balance", {
    id:user.id,
    balance:ADMIN_USER_BALANCE,
    stocks:ADMIN_USER_STOCKS
  }, MarketType.spot)

  handleQueueError(queueResponseSpot);

  const queueResponsePerp = await pushToQueue("init_user_balance", {
    id:user.id,
    balance:ADMIN_USER_BALANCE
  }, MarketType.perp)

  handleQueueError(queueResponsePerp);

  console.log("ADMIN ACCOUNT CREATED");
}

function initMigrations(){
  execSync("npx prisma migrate dev")
  console.log("PRISMA MIGRATIONS APPLIED")
}

export {
  initAdminUser,
  initMigrations
}