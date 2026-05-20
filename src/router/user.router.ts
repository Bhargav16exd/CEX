import { Router } from "express";
import { addBalance, signin, signup } from "../controllers/user/user.controller.js";


const router = Router();

//@ts-ignore
router.route("/signup").post(signup);
router.route("/signin").post(signin);
router.route("/add-balance").patch(addBalance);

export default router;