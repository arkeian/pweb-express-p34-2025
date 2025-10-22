import express from "express";
import authRoutes from "./routes/auth.routes";
import transactionRoutes from "./routes/transaction.route"; // 🆕 Import route transaksi

const app = express();

// Middleware bawaan
app.use(express.json());

// Routes
app.use("/auth", authRoutes);               // 🔹 Route untuk autentikasi (sudah ada)
app.use("/transactions", transactionRoutes); // 🆕 Route untuk transaksi dan statistik

// Optional: Health check endpoint (bisa dihapus kalau tidak perlu)
app.get("/", (req, res) => {
  res.json({ message: "IT Literature Shop API is running 🚀" });
});

// Error handler sederhana (opsional tapi bagus untuk debugging)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

export default app;
