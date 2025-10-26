import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { parsePagination, metaResponse } from "../utils/pagination";

const prisma = new PrismaClient();

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const userId = authUser?.id || authUser?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Validation error",
        data: [{ msg: "Items must be a non-empty array", path: "items", location: "body" }]
      });
    }

    for (const [index, item] of items.entries()) {
      if (!item.bookId) {
        return res.status(422).json({
          success: false,
          message: "Validation error",
          data: [{ msg: "bookId is required", path: `items[${index}].bookId`, location: "body" }]
        });
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return res.status(422).json({
          success: false,
          message: "Validation error",
          data: [{ msg: "quantity must be a positive integer", path: `items[${index}].quantity`, location: "body" }]
        });
      }
    }

    const qtyByBook = new Map<string, number>();
    for (const item of items) {
      qtyByBook.set(item.bookId, (qtyByBook.get(item.bookId) || 0) + item.quantity);
    }

    const bookIds = Array.from(qtyByBook.keys());
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds }, deletedAt: null },
      select: { id: true, title: true, price: true, stockQuantity: true }
    });

    if (books.length !== bookIds.length) {
      const found = new Set(books.map(b => b.id));
      const missing = bookIds.filter(id => !found.has(id));
      return res.status(404).json({ success: false, message: `Book(s) not found: ${missing.join(", ")}` });
    }

    for (const b of books) {
      const requested = qtyByBook.get(b.id)!;
      if (b.stockQuantity < requested) {
        return res.status(400).json({ success: false, message: `Not enough stock for "${b.title}"` });
      }
    }

    let totalAmount = 0;
    const txItemsData = books.map(b => {
      const quantity = qtyByBook.get(b.id)!;
      totalAmount += b.price * quantity;
      return { bookId: b.id, quantity, price: b.price };
    });

    const transaction = await prisma.$transaction(async tx => {
      for (const b of books) {
        const q = qtyByBook.get(b.id)!;
        await tx.book.update({
          where: { id: b.id },
          data: { stockQuantity: b.stockQuantity - q }
        });
      }

      return await tx.transaction.create({
        data: {
          userId,
          totalAmount,
          items: { create: txItemsData }
        },
        include: {
          items: { include: { book: { select: { id: true, title: true } } } }
        }
      });
    });

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: transaction
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const total = await prisma.transaction.count();
    const transactions = await prisma.transaction.findMany({
      include: {
        user: { select: { id: true, username: true, email: true } },
        items: { include: { book: { select: { id: true, title: true } } } }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    });

    return res.json({
      success: true,
      message: "Get all transactions successfully",
      data: transactions,
      meta: metaResponse(page, limit, total)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, email: true } },
        items: { include: { book: { select: { id: true, title: true } } } }
      }
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    return res.json({
      success: true,
      message: "Get transaction detail successfully",
      data: transaction
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getTransactionStatistics = async (req: Request, res: Response) => {
  try {
    const totalTransactions = await prisma.transaction.count();
    const averageAmountAgg = await prisma.transaction.aggregate({ _avg: { totalAmount: true } });
    const itemAgg = await prisma.transactionItem.groupBy({ by: ["bookId"], _sum: { quantity: true } });

    if (itemAgg.length === 0) {
      return res.json({
        success: true,
        message: "Get transaction statistics successfully",
        data: {
          totalTransactions,
          averageAmount: averageAmountAgg._avg.totalAmount || 0,
          mostPopularGenre: null,
          leastPopularGenre: null
        }
      });
    }

    const books = await prisma.book.findMany({
      where: { id: { in: itemAgg.map(i => i.bookId) } },
      select: { id: true, genreId: true }
    });

    const genreByBook = new Map(books.map(b => [b.id, b.genreId]));
    const quantityByGenre = new Map<string, number>();

    for (const item of itemAgg) {
      const gid = genreByBook.get(item.bookId);
      if (!gid) continue;
      const q = item._sum.quantity ?? 0;
      quantityByGenre.set(gid, (quantityByGenre.get(gid) || 0) + q);
    }

    const genres = await prisma.genre.findMany({
      where: { id: { in: Array.from(quantityByGenre.keys()) }, deletedAt: null },
      select: { id: true, name: true }
    });

    const nameByGenre = new Map(genres.map(g => [g.id, g.name]));
    const filtered = Array.from(quantityByGenre.entries()).filter(([gid]) => nameByGenre.has(gid));

    if (filtered.length === 0) {
      return res.json({
        success: true,
        message: "Get transaction statistics successfully",
        data: {
          totalTransactions,
          averageAmount: averageAmountAgg._avg.totalAmount || 0,
          mostPopularGenre: null,
          leastPopularGenre: null
        }
      });
    }

    let mostId = filtered[0][0];
    let leastId = filtered[0][0];
    for (const [gid, qty] of filtered) {
      if (qty > (quantityByGenre.get(mostId) || 0)) mostId = gid;
      if (qty < (quantityByGenre.get(leastId) || 0)) leastId = gid;
    }

    return res.json({
      success: true,
      message: "Get transaction statistics successfully",
      data: {
        totalTransactions,
        averageAmount: averageAmountAgg._avg.totalAmount || 0,
        mostPopularGenre: nameByGenre.get(mostId) || null,
        leastPopularGenre: nameByGenre.get(leastId) || null
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
