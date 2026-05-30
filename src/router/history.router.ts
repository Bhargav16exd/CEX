import { Router } from "express";

import { authenticationMiddleware } from "../middleware/auth.middleware.js";
import { allFills, allOrders, fills, orders } from "../controllers/history/history.controller.js";

const router = Router();

router.route("/fills").get(authenticationMiddleware, allFills);
router.route("/orders").get(authenticationMiddleware, allOrders);

router.route("/fills/:market/:symbol").get(authenticationMiddleware, fills);
router.route("/orders/:market/:symbol").get(authenticationMiddleware, orders);

export default router;