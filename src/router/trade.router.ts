import { Router } from "express";
import { fills } from "../controllers/trades/trades.controller.js";

const router = Router();

router.route("/fills").post(fills);

export default router;