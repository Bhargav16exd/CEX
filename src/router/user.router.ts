import { Router } from "express";
import { addBalance, signup } from "../constants/user.controller.js";

const router = Router();

//@ts-ignore
router.route("/signup").post(signup);
router.route("/add-balance").patch(addBalance);


export default router;