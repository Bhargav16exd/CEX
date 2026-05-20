import * as z from "zod";

const createStockValidatorZod = z.object({
  name:z.string(),
  symbol:z.string()
})

export {
  createStockValidatorZod
}