import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 🧩 POST /transactions
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items cannot be empty" });
    }

    let totalAmount = 0;
    const transactionItems: any[] = [];

    for (const item of items) {
      const book = await prisma.book.findUnique({ where: { id: item.bookId } });
      if (!book) return res.status(404).json({ message: `Book ${item.bookId} not found` });
      if (book.stock < item.quantity)
        return res.status(400).json({ message: `Not enough stock for ${book.title}` });

      totalAmount += book.price * item.quantity;
      transactionItems.push({ bookId: book.id, quantity: item.quantity, price: book.price });

      await prisma.book.update({
        where: { id: book.id },
        data: { stock: book.stock - item.quantity },
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        totalAmount,
        items: { create: transactionItems },
      },
      include: { items: true },
    });

    return res.status(201).json({ message: "Transaction created successfully", transaction });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🧩 GET /transactions
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        items: { include: { book: true } },
        user: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(transactions);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🧩 GET /transactions/:id
export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        items: { include: { book: true } },
        user: { select: { id: true, username: true } },
      },
    });

    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    res.json(transaction);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🧩 GET /transactions/statistics
export const getTransactionStatistics = async (req: Request, res: Response) => {
  try {
    const totalTransactions = await prisma.transaction.count();
    const averageAmountData = await prisma.transaction.aggregate({
      _avg: { totalAmount: true },
    });

    const genreStats = await prisma.transactionItem.groupBy({
      by: ["bookId"],
      _sum: { quantity: true },
    });

    const genreCount: Record<string, number> = {};

    for (const stat of genreStats) {
      const book = await prisma.book.findUnique({
        where: { id: stat.bookId },
        include: { genre: true },
      });
      if (book?.genre) {
        const genreName = book.genre.name;
        genreCount[genreName] = (genreCount[genreName] || 0) + (stat._sum.quantity ?? 0);
      }
    }

    const genres = Object.keys(genreCount);
    const mostPopularGenre =
      genres.length > 0
        ? genres.reduce((a, b) => (genreCount[a] > genreCount[b] ? a : b))
        : null;
    const leastPopularGenre =
      genres.length > 0
        ? genres.reduce((a, b) => (genreCount[a] < genreCount[b] ? a : b))
        : null;

    res.json({
      totalTransactions,
      averageAmount: averageAmountData._avg.totalAmount || 0,
      mostPopularGenre,
      leastPopularGenre,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};
