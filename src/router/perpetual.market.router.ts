import { Router } from "express";
import { closedContracts, deleteOrder, depth, openContracts, Order } from "../controllers/perp/perpetual.stock.controller.js";
import { authenticationMiddleware } from "../middleware/auth.middleware.js";
;

const router = Router();

router.route("/order").post(authenticationMiddleware, Order);
router.route("/order").delete(deleteOrder);

router.route("/contracts/open/:marketId/:userId").get(openContracts);
router.route("/contracts/closed/:marketId/:userId").get(closedContracts);

router.route("/depth/:stockSymbol").get(depth);

export default router;
