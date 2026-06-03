import { Router } from "express";
import { closedContracts, deleteOrder, depth, openContracts, OpenOrders, Order } from "../controllers/perp/perpetual.stock.controller.js";
import { authenticationMiddleware } from "../middleware/auth.middleware.js";
;

const router = Router();

//router.route("/order").post(authenticationMiddleware, Order);
router.route("/order").post(authenticationMiddleware, Order);
router.route("/order").delete(deleteOrder);

router.route("/order/open/:symbol").get(authenticationMiddleware, OpenOrders);

router.route("/contracts/open/:symbol/:userId").get(openContracts);
router.route("/contracts/closed/:symbol/:userId").get(closedContracts);

router.route("/depth/:stockSymbol").get(depth);

export default router;
