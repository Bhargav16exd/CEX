import { Router } from "express";
import { CancelOrder, depth, OpenOrders, Order, ReadStocks, Stocks } from "../controllers/spot/spot.stock.controller.js";
import { authenticationMiddleware, isAdminRoute } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/order").post(authenticationMiddleware, Order);
router.route("/cancel-order").post(authenticationMiddleware, CancelOrder);

router.route("/depth/:stockSymbol").get(depth)

router.route("/order/open/:symbol").get(authenticationMiddleware, OpenOrders)

router.route("/stocks").post(authenticationMiddleware, isAdminRoute, Stocks);
router.route("/stocks/:symbol").get(authenticationMiddleware, ReadStocks);

export default router;