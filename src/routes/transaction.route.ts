import express from "express";
import {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  getTransactionStatistics,
} from "../controllers/transaction.controller";
import { requireAuth } from "../middlewares/auth.middlewares";

const router = express.Router();

router.post("/", requireAuth, createTransaction);
router.get("/", requireAuth, getAllTransactions);
router.get("/statistics", requireAuth, getTransactionStatistics);
router.get("/:id", requireAuth, getTransactionById);

export default router;
