import { Router } from "express";
import { addBalance, signup } from "../controllers/user.controller.js";


const router = Router();

//@ts-ignore
router.route("/signup").post(signup);
router.route("/add-balance").patch(addBalance);


export default router;