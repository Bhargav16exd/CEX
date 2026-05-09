import { Router } from "express";
import { Order } from "../constants/stock.controller.js";

const router = Router();


router.route("/order").post(Order)

export default router;