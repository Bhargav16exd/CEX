import { Router } from "express";
import { createStock, deleteStock, depositBalance, readStocks, updateStock } from "../controllers/markets/stock.controller.js";
import { upload } from "../middleware/multer.js";
import { authenticationMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.route('/stock').post(authenticationMiddleware, createStock);
router.route('/stocks').get(authenticationMiddleware, readStocks);
router.route('/stock').patch(upload.single('file'), updateStock);
router.route('/stock').delete(deleteStock);

router.route('/deposit-balance').post(depositBalance);

export default router;
