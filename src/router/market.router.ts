import { Router } from "express";
import { createStock, deleteStock, depositBalance, updateStock } from "../controllers/markets/stock.controller.js";
import { upload } from "../middleware/multer.js";

const router = Router();

router.route('/stock').post(upload.single('file'), createStock);
router.route('/stock').patch(upload.single('file'), updateStock);
router.route('/stock').delete(deleteStock);

router.route('/deposit-balance').post(depositBalance);

export default router;
