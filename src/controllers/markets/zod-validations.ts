import * as z from "zod";

const createStockValidatorZod = z.object({
  title:z.string(),
  symbol:z.string(),
  market:z.string()
})

export {
  createStockValidatorZod
}