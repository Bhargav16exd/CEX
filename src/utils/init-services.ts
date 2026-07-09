import dotenv from "dotenv"
import { prisma } from "../db/prisma.client.js";
import bcrypt from "bcrypt"
import { SALT_ROUNDS } from "../controllers/user/user.controller.js";

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

  await prisma.user.create({
    data:{
      username,
      password:hashedPassword,
      balance:0,
      role:"admin"
    }
  })

  console.log("ADMIN ACCOUNT CREATED");
}

export {
  initAdminUser
}