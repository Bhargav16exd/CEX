import { Router } from "express";
import { Order } from "../controllers/perp/perpetual.stock.controller.js";
;

const router = Router();

router.route("/order").post(Order);

export default router;
