import type { NextFunction, Request, Response } from "express"
import bcrypt from "bcrypt"
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";
import { prisma } from "../../db/prisma.client.js";
import jwt from "jsonwebtoken"

import { signupValidatorZod } from "../user/zod-validations.js"
import { pushToQueue } from "../../utils/engine-client.js";
import { MarketType } from "@cex/shared";
import { depositBalanceValidatorZod } from "../markets/zod-validations.js";

const SALT_ROUNDS = 10 

const generateSignedToken = (id:string):string=> {
  const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || ""
  const token = jwt.sign({
      id,
    },
    JWT_SECRET_KEY,
    {
      expiresIn: '1d'
    }
  )
  return token
}

//SIGNUP
const signup = async (req:Request, res:Response, next:any) => {
	try {

		const {username, password} = req.body;

    const isValidated = await signupValidatorZod.safeParseAsync({username, password});

    if(!isValidated.success){
      throw new HttpErrorResponse(400, false, "Invalid Input Format");
    }

		if(!username || !username.trim() || !password || !password.trim()){
			throw new HttpErrorResponse(400, false, "Incomplete Inputs");
		}

		const existingUser = await prisma.user.findUnique({
			where:{
				username
			}
		})

		if(existingUser){
			throw new HttpErrorResponse(400, false, "Please choose another username");
		}

		const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

		const user = await prisma.user.create({
			data:{
				username,
				password:hashedPassword,
				balance:0
			}
		}
	)

	if(!user){
		throw new HttpErrorResponse(500, false, "Internal Server Error");
	}

	//send this to queue
	//initUserInBalanceStore(user);

	res.json(new HttpSuccessResponse(201, true, "User Onboarded"));

	} catch (error) {
		next(error);
	}
}

//SIGIN
const signin = async (req:Request, res:Response, next:any) => {
	try {

    const { username, password } = req.body;

    const isValidated = await signupValidatorZod.safeParseAsync({username, password});

    if(!isValidated.success){
      throw new HttpErrorResponse(400, false, "Invalid Input Format");
    }

    if(!username || !username.trim() || !password || !password.trim()){
      throw new HttpErrorResponse(400, false, "Incomplete Inputs");
    }

    const user = await prisma.user.findUnique({
      where:{
        username
      }
    })

    if(!user){
      throw new HttpErrorResponse(400, false, "Please choose another username");
    }

    const brcyptResult = await bcrypt.compare(password, user.password)

    if(!brcyptResult){
      throw new HttpErrorResponse(400, false, "Incorrect Password");
    }

    const token = generateSignedToken(user.id.toString());

	  res.json(new HttpSuccessResponse(201, true, "User Onboarded",{
      token,
      role:user.role
    }));

	} catch (error) {
		next(error);
	}
}

const depositBalance = async(req:Request, res:Response, next:any) => {
  try {
    //@ts-ignore
    const id = req.id
    const {balance, marketType } = req.body
    const { market } = req.params

    if(!market){
      throw new HttpErrorResponse(400, false, "Invalid Inputs");
    }

    if(market != MarketType.spot && market != MarketType.perp){
      throw new HttpErrorResponse(400, false, "Invalid Market Type");
    }

    if(!id || !balance){
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

    if(marketType == MarketType.perp){
      queueRes = await pushToQueue("update_balance", req.body, MarketType.perp);
    }

    if(marketType == MarketType.spot){
      queueRes = await pushToQueue("update_balance", req.body, MarketType.spot);
    }

    return res.json(new HttpSuccessResponse(200, true, "Amount Deposited",queueRes?.data!));
    
  } catch (error) {
    next(error)
  }
}

const readBalance = async (req:any, res:Response, next:NextFunction) => {
  try {

    const { market } = req.params

    if(!market){
      throw new HttpErrorResponse(400, false, "Invalid Inputs");
    }

    if(market != MarketType.spot && market != MarketType.perp){
      throw new HttpErrorResponse(400, false, "Invalid Market Type");
    }

    let queueResponse;

    if(market === MarketType.perp){
      queueResponse = await pushToQueue("get_user_balance",{
        userId:req?.id
      }, MarketType.perp);
    }

    if(market === MarketType.spot){
      queueResponse = await pushToQueue("get_user_balance",{
        userId:req?.id
      }, MarketType.spot);
    }

    if(queueResponse!.ok == false){
      throw new HttpErrorResponse(400, false, queueResponse!.error || "Internal Server Error");
    }

    return res
    .status(200)
    .json(new HttpSuccessResponse(200, true, "Balance", {balance:queueResponse!.data}))

  } catch (error) {
    next(error)
  }
}

export {
	signup,
  signin,
  depositBalance,
  readBalance
}