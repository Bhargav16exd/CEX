import type { Request, Response } from "express"
import { HttpErrorResponse } from "../../utils/http.responses.js";
import { createStockValidatorZod } from "./zod-validations.js";


const createStock = (req:Request, res:Response, next:any) => {
  try {
    
    const { name, symbol } = req.body;

    if(!name || !symbol){
      throw new HttpErrorResponse(400, false, "Invalid Inputs");
    }

    const isValidated = createStockValidatorZod.safeParse({
      name,
      symbol
    })

    if(!isValidated.success){
      throw new HttpErrorResponse(400, false, "Invalid Input Format");
    }

    console.log(req.file)

  } catch (error) {
    next(error)
  }
}

export {
  createStock
}