import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../db/prisma.client.js";
import { HttpErrorResponse, HttpSuccessResponse } from "../../utils/http.responses.js";


export const fills = async (req:Request, res:Response, next:NextFunction) => {
  try { 
    let {id} = req.body

    const isUserExist = await prisma.user.findUnique({
      where:{
        id
      }
    })

    console.log(isUserExist)

    if(!isUserExist){
      throw new HttpErrorResponse(400, false, "Invalid User ID");
    }

    id = id.toString()

    const fills = await prisma.fill.findMany({
      take:10,
      where:{
        OR:[
          {makerID:id},
          {takerID:id}
        ]
      }
    })


    return res.json(new HttpSuccessResponse(200, true, "Fills", fills));

  } catch (error) {
    console.log(error)
    next(error) 
  }
}