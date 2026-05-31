import { Router } from "express";
import { createStock, deleteStock, depositBalance, readStocks, updateStock } from "../controllers/markets/stock.controller.js";
import { upload } from "../middleware/multer.js";
import { authenticationMiddleware, isAdminRoute } from "../middleware/auth.middleware.js";

const router = Router();

router.route('/stock').post(authenticationMiddleware, isAdminRoute, createStock);

router.route('/stocks/:market').get(readStocks);
router.route('/stock').patch(upload.single('file'), updateStock);
router.route('/stock').delete(deleteStock);

router.route('/deposit-balance').post(depositBalance);

export default router;
