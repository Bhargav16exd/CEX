import { Router } from "express";
import { depth, Order } from "../controllers/spot/spot.stock.controller.js";
import { authenticationMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/order").post(authenticationMiddleware, Order)

router.route("/depth/:stockSymbol").get(depth)

export default router;