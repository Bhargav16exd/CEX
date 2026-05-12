import dotenv from "dotenv"
import express, { urlencoded } from 'express';
import cookieParser from "cookie-parser"
import cors from "cors"

//route imports
import userRouter from "./router/user.router.js"
import stockRouter from "./router/stock.router.js"
import { initBalancesBackup, initOrderBookBackup, loadBalanceBackup, loadOrderBookBackup } from "./memory-store/backup/backup-store.js";


dotenv.config()

//CONST DECLARATIONS
const PORT = process.env.PORT || 6969;

//INIT APP
const app = express();

app.use(express.json());
app.use(urlencoded(({extended:true})));
app.use(cookieParser())
app.use(cors({
  origin:"*"
}))

//Routes
app.use("/api/user", userRouter);
app.use("/api/stock", stockRouter);

//Supporting Services
loadBalanceBackup().then(()=>{
  initBalancesBackup();
})

loadOrderBookBackup().then(()=>{
  initOrderBookBackup();
})

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
