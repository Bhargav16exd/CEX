import { Router } from "express";
import { createStock, deleteStock, updateStock } from "../controllers/markets/stock.controller.js";
import { upload } from "../middleware/multer.js";

const router = Router();

router.route('/stock').post(upload.single('file'), createStock);
router.route('/stock').patch(upload.single('file'), updateStock);
router.route('/stock').delete(deleteStock);

export default router;
