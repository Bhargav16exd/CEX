import dotenv from "dotenv"
import express, { urlencoded } from 'express';
import cookieParser from "cookie-parser"

//route imports
import userRouter from "./router/user.router.js"
import { initBalancesBackup, initOrderBookBackup, loadBalanceBackup, loadOrderBookBackup } from "./memory-store/backup/backup-store.js";

dotenv.config()

//CONST DECLARATIONS
const PORT = process.env.PORT || 6969;

//INIT APP
const app = express();

app.use(express.json());
app.use(urlencoded(({extended:true})));
app.use(cookieParser())

//Routes
app.use("/api/user", userRouter);
app.use("/api/stock",)

//Supporting Services
loadBalanceBackup().then(()=>{
  console.log("Balances Lodaded")
  initBalancesBackup()
})

loadOrderBookBackup().then(()=>{
  initOrderBookBackup()
})

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
