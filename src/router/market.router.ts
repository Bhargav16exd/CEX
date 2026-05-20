import { Router } from "express";
import { createStock } from "../controllers/markets/stock.controller.js";
import { upload } from "../middleware/multer.js";

const router = Router();

router.route('/stock').post(upload.single('file'), createStock);

export default router;
