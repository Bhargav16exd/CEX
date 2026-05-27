import type { NextFunction } from "express";
import { HttpErrorResponse } from "../utils/http.responses.js";
import jwt from "jsonwebtoken"

export const authenticationMiddleware = async (req:any, _:any, next:NextFunction) => {
  try {
    const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY!

    if(!req.header("Authorization")){
      throw new HttpErrorResponse(403, false, "Required Headers Missing");
    }

    const token = req.header("Authorization").split(" ")[1]

    if(token === undefined || !token){
      throw new HttpErrorResponse(403, false, "Invalid Token");
    }

    const {id} : any = jwt.verify(token, JWT_SECRET_KEY);
 
    if(!id){
      throw new HttpErrorResponse(500, false, "Internal Server Error")
    }
    
    req.id = id;

    next()
  } catch (error:any) {
    if(error?.name == "TokenExpiredError"){
      throw new HttpErrorResponse(403, false, "Token Expired");
    }
    throw new HttpErrorResponse(500, false, error.message);
  }
}