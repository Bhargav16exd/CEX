import * as z from "zod";

const createStockValidatorZod = z.object({
  title:z.string(),
  symbol:z.string(),
  market:z.string()
})

const depositBalanceValidatorZod = z.object({
  id:z.string(),
  balance:z.number(),
  marketType:z.string()
})

export {
  createStockValidatorZod,
  depositBalanceValidatorZod
}