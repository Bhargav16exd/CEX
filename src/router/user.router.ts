import { Router } from "express";
import { depositBalance, readBalance, signin, signup } from "../controllers/user/user.controller.js";
import { authenticationMiddleware } from "../middleware/auth.middleware.js";


const router = Router();

//PUBLIC ROUTES
router.route("/signup").post(signup);
router.route("/signin").post(signin);

//AUTHENTIACATED ROUTES
router.route('/balance/:market').post(authenticationMiddleware, depositBalance);
router.route("/balance/:market").get(authenticationMiddleware, readBalance);

export default router;