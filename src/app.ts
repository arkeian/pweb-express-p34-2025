import express from "express";
import authRoutes from "./routes/auth.routes";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import booksRouter from "./routes/book.routes";
import genreRouter from "./routes/genre.routes";
import { errorHandler } from "./middlewares/error.middlewares";
import transactionRoutes from "./routes/transaction.route";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

app.use("/auth", authRoutes);
app.use("/books", booksRouter);
app.use("/genre", genreRouter);
app.use("/transactions", transactionRoutes);

app.get("/health-check", (req, res) => {
  res.json({ success: true, message: "IT Literature Shop API is running", date: new Date().toDateString() });
});

app.use((req, res) => res.status(404).json({ success: false, message: "Endpoint not found" }));

app.use(errorHandler);

export default app;
