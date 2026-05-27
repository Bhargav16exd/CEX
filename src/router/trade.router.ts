import { Router } from "express";
import { allFills, allOrders, orders } from "../controllers/trades/trades.controller.js";
import { authenticationMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/all-fills").get(authenticationMiddleware, allFills);
router.route("/all-orders").get(authenticationMiddleware, allOrders);

router.route("/orders/:marketId").get(authenticationMiddleware, orders);

export default router;