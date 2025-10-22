import express from "express";
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  getTransactionStatistics,
} from "../controllers/transaction.controller";
import { requireAuth } from "../middlewares/auth.middlewares"; // 🟢 pakai requireAuth yang kamu punya

const router = express.Router();

// 🧩 Buat transaksi baru
router.post("/", requireAuth, createTransaction);

// 🧾 Ambil semua transaksi
router.get("/", requireAuth, getTransactions);

// 📊 Statistik transaksi
router.get("/statistics", requireAuth, getTransactionStatistics);

// 🔍 Detail transaksi berdasarkan ID
router.get("/:id", requireAuth, getTransactionById);

export default router;
