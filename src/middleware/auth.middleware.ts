import type { NextFunction } from "express";
import { HttpErrorResponse } from "../utils/http.responses.js";
import jwt from "jsonwebtoken"
import { prisma } from "../db/prisma.client.js";

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
    
    const user = await prisma.user.findFirst({
      where:{
        id:Number(id)
      }
    })

    if(!user){
      throw new HttpErrorResponse(500, false, "Invalid User Id")
    }

    req.id = id;
    req.role = user.role;

    next();
  } catch (error:any) {
    if(error?.name == "TokenExpiredError"){
      throw new HttpErrorResponse(403, false, "Token Expired");
    }
    throw new HttpErrorResponse(500, false, error.message);
  }
}

export const isAdminRoute = (req:any,_:any,next:NextFunction) => {
  try {
    const role = req.role
    if(!role){
      throw new HttpErrorResponse(500, false, "Internal Server Error");
    }

    if(role != "admin"){
      throw new HttpErrorResponse(403, false, "Not Enough Permissions");
    }
    
    next();
    
  } catch (error:any) {
     if(error?.message == "Not Enough Permissions"){
      throw new HttpErrorResponse(403, false, "Not Enough Permissions");
    }
    throw new HttpErrorResponse(500, false, "Internal Server Error");
  }
}