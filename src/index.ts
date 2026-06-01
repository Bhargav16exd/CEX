import dotenv from "dotenv"
import express, { urlencoded, type NextFunction, type Request, type Response } from 'express';
import cookieParser from "cookie-parser"
import cors from "cors"

//route imports
import userRouter from "./router/user.router.js"
import spotMarketRouter from "./router/spot.market.router.js"
import perpetualMarketRouter from "../src/router/perpetual.market.router.js"
import marketRouter from "./router/market.router.js"
import { SERVER_INSTANCE_ID } from "./config.js";
import historyRouter from "./router/history.router.js"
import { initSupportingServices } from "./utils/supporting-services.js";

dotenv.config();

//CONST DECLARATIONS
const PORT = process.env.PORT || 6969;
const CORS_ORIGIN_URL = process.env.CORS_ORIGIN_URL || ""

//INIT APP
const app = express();

app.use(express.json());
app.use(urlencoded(({extended:true})));
app.use(cookieParser())
app.use(cors({
  origin:CORS_ORIGIN_URL
}))

//Routes
app.use("/api/user", userRouter);
app.use("/api/spot", spotMarketRouter);
app.use("/api/perpetual", perpetualMarketRouter);
app.use("/api/market", marketRouter);
app.use("/api/history", historyRouter);

// Error Handler
app.use((
  err:any,
  _:Request,
  res:Response,
  next:NextFunction
) => {

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err.message || "Internal Server Error",
  });

});

app.listen(PORT, async () => {
  console.log(`Server instance : ${SERVER_INSTANCE_ID} is running at http://localhost:${PORT}`);

  initSupportingServices();
});
