import type { Request, Response } from "express"
import { HttpErrorResponse, HttpSuccessResponse } from "../utils/http.responses.js";
import bcrypt from "bcrypt"
import { prisma } from "../db/prisma.client.js";
import { initUserInBalanceStore } from "../memory-store/balance/balance-store.js";

const SALT_ROUNDS = 10 

//SIGNUP
const signup = async (req:Request, res:Response) => {
	try {

		const {username, password} = req.body;

		if(!username || !username.trim() || !password || !password.trim()){
			throw new HttpErrorResponse(400, false, "Incomplete Inputs");
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

	initUserInBalanceStore(user);

	res.json(new HttpSuccessResponse(201, true, "User Onboarded"));

	} catch (error) {
		console.log(error)
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

export {
	signup,
	addBalance
}