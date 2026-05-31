import type { NextFunction, Request, Response } from "express"
import bcrypt from "bcrypt"
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";
import { prisma } from "../../db/prisma.client.js";
import jwt from "jsonwebtoken"

import { signupValidatorZod } from "../user/zod-validations.js"
import { MarketType } from "../markets/stock.controller.js";
import { pushToQueue } from "../../utils/engine-client.js";
import { EngineType } from "../../types/engine.js";

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

const addBalance = async (req: Request, res:Response) => {
	try {
		const {id , balance} = req.body

		if(!id || !balance){
			throw new HttpErrorResponse(400, false, "Invalid Inputs");
		}

		const user = await prisma.user.update({
			where:{
				id: Number(id)
			},
			data:{
				balance,
			}
		})

		if(!user){
			throw new HttpErrorResponse(400, false, "Invalid User");
		}

		res.json(new HttpSuccessResponse(201, true, "Balance Credited"));
	} catch (error) {
		throw(error)
	}
}

const readBalance = async (req:any, res:Response, next:NextFunction) => {
  try {

    const { market } = req.params

    if(!market){
      throw new HttpErrorResponse(400, false, "Invalid Inputs");
    }

    if(market != MarketType.SPOT && market != MarketType.PERPETUAL){
      throw new HttpErrorResponse(400, false, "Invalid Market Type");
    }

    let queueResponse;

    if(market === MarketType.PERPETUAL){
      queueResponse = await pushToQueue("get_user_balance",{
        userId:req?.id
      }, EngineType.PERP);
    }

    if(market === MarketType.SPOT){
      queueResponse = await pushToQueue("get_user_balance",{
        userId:req?.id
      }, EngineType.SPOT);
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
	addBalance,
  readBalance
}