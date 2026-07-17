import { Router } from "express";

import { authenticationMiddleware } from "../middleware/auth.middleware.js";
import { allFills, allOrders, fills, globalFills, orders } from "../controllers/history/history.controller.js";

const router = Router();

router.route("/global-fills").get(globalFills);

router.route("/fills/:market").get(authenticationMiddleware, allFills);
router.route("/orders/:market").get(authenticationMiddleware, allOrders);

router.route("/fills/:market/:symbol").get(authenticationMiddleware, fills);
router.route("/orders/:market/:symbol").get(authenticationMiddleware, orders);

export default router;