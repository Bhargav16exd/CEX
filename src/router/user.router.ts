import { Router } from "express";
import { addBalance, signin, signup } from "../controllers/user/user.controller.js";
import { authenticationMiddleware } from "../middleware/auth.middleware.js";


const router = Router();

//@ts-ignore
router.route("/signup").post(signup);
router.route("/signin").post(signin);

router.route("/add-balance").patch(authenticationMiddleware, addBalance);

export default router;