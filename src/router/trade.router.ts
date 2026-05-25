import { Router } from "express";
import { fills, orders } from "../controllers/trades/trades.controller.js";

const router = Router();

router.route("/fills").post(fills);
router.route("/orders/:marketId").get(orders);

export default router;