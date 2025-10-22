import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { parsePagination, metaResponse } from "../utils/pagination";
import { validationResult } from "express-validator";

const prisma = new PrismaClient();

export const createBook = async (req: Request, res: Response) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ success: false, message: "Validation error", data: errors.array() });
        }

        const {
            title,
            writer,
            publisher,
            isbn,
            description,
            publicationYear,
            condition,
            price,
            stockQuantity,
            genreId
        } = req.body;

        const genre = await prisma.genre.findFirst({ where: { id: genreId, deletedAt: null } });

        if (!genre) {
            return res.status(404).json({ success: false, message: "Genre not found" });
        }

        const book = await prisma.book.create({
            data: {
                title,
                writer,
                publisher,
                isbn,
                description,
                publicationYear,
                condition,
                price,
                stockQuantity,
                genreId
            }
        });

        return res.status(201).json({ success: true, message: "Book added successfully", data: { id: book.id, title: book.title, createdAt: book.createdAt } });
    }
    catch (err) {
        throw err;
    }
};

export const getAllBooks = async (req: Request, res: Response) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const search = (req.query.search as string | undefined) || "";
        const orderByTitle = (req.query.orderByTitle as string | undefined) || undefined;
        const orderByPublishDate = (req.query.orderByPublishDate as string | undefined) || undefined;
        const condition = (req.query.condition as string | undefined) || undefined;
        const where: any = { deletedAt: null, genre: { deletedAt: null } };

        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { writer: { contains: search, mode: "insensitive" } },
                { publisher: { contains: search, mode: "insensitive" } },
            ];
        }

        if (condition) {
            where.condition = condition;
        }

        const orderBy: any[] = [];

        if (orderByTitle) {
            orderBy.push({ title: orderByTitle === "asc" ? "asc" : "desc" });
        }

        if (orderByPublishDate) {
            orderBy.push({ publicationYear: orderByPublishDate === "asc" ? "asc" : "desc" });
        }

        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }

        const total = await prisma.book.count({ where });
        const books = await prisma.book.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            select: {
                id: true,
                title: true,
                writer: true,
                publisher: true,
                description: true,
                publicationYear: true,
                price: true,
                stockQuantity: true,
                genre: { select: { name: true } }
            }
        });

        const mapped = books.map(b => ({
            ...b,
            genre: b.genre?.name ?? null
        }));

        return res.json({
            success: true,
            message: "Get all book successfully",
            data: mapped,
            meta: metaResponse(page, limit, total)
        });

    }
    catch (err) {
        throw err;
    }
};

export const getBookById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const book = await prisma.book.findFirst({
            where: { id, deletedAt: null, genre: { deletedAt: null } },
            include: { genre: true }
        });

        if (!book) {
            return res.status(404).json({ success: false, message: "Book not found" });
        }

        return res.json({
            success: true,
            message: "Get book detail successfully",
            data: {
                id: book.id,
                title: book.title,
                writer: book.writer,
                publisher: book.publisher,
                description: book.description,
                publicationYear: book.publicationYear,
                price: book.price,
                stockQuantity: book.stockQuantity,
                genre: book.genre?.name ?? null
            }
        });
    }
    catch (err) {
        throw err;
    }
};

export const getBooksByGenre = async (req: Request, res: Response) => {
    try {
        const genreId = req.params.id;
        const { page, limit, skip } = parsePagination(req.query);
        const search = (req.query.search as string | undefined) || "";
        const orderByTitle = (req.query.orderByTitle as string | undefined) || undefined;
        const orderByPublishDate = (req.query.orderByPublishDate as string | undefined) || undefined;
        const condition = (req.query.condition as string | undefined) || undefined;
        const genre = await prisma.genre.findFirst({ where: { id: genreId, deletedAt: null } });

        if (!genre) {
            return res.status(404).json({ success: false, message: "Genre not found" });
        }

        const where: any = { deletedAt: null, genreId: genreId };

        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { writer: { contains: search, mode: "insensitive" } },
                { publisher: { contains: search, mode: "insensitive" } },
            ];
        }

        if (condition) {
            where.condition = condition;
        }

        const orderBy: any[] = [];

        if (orderByTitle) {
            orderBy.push({ title: orderByTitle === "asc" ? "asc" : "desc" });
        }

        if (orderByPublishDate) {
            orderBy.push({ publicationYear: orderByPublishDate === "asc" ? "asc" : "desc" });
        }

        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }

        const total = await prisma.book.count({ where });
        const books = await prisma.book.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            select: {
                id: true,
                title: true,
                writer: true,
                publisher: true,
                description: true,
                publicationYear: true,
                price: true,
                stockQuantity: true,
            }
        });

        return res.json({
            success: true,
            message: "Get all book by genre successfully",
            data: books,
            meta: metaResponse(page, limit, total)
        });

    }
    catch (err) {
        throw err;
    }
};

export const updateBook = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const { description, price, stockQuantity } = req.body;
        const bookExisting = await prisma.book.findFirst({ where: { id, deletedAt: null } });

        if (!bookExisting) {
            return res.status(404).json({ success: false, message: "Book not found" });
        }

        const dataToUpdate: any = { updatedAt: new Date() };

        if (description !== undefined) {
            dataToUpdate.description = description;
        }

        if (price !== undefined) {
            dataToUpdate.price = price;
        }

        if (stockQuantity !== undefined) {
            dataToUpdate.stockQuantity = stockQuantity;
        }

        const updated = await prisma.book.update({
            where: { id },
            data: dataToUpdate
        });

        return res.json({ success: true, message: "Book updated successfully", data: { id: updated.id, title: updated.title, updatedAt: updated.updatedAt } });
    }
    catch (err) {
        throw err;
    }
};

export const deleteBook = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const book = await prisma.book.findFirst({ where: { id, deletedAt: null } });

        if (!book) {
            return res.status(404).json({ success: false, message: "Book not found" });
        }

        await prisma.book.update({ where: { id }, data: { deletedAt: new Date() } });

        return res.json({ success: true, message: "Book removed successfully" });
    }
    catch (err) {
        throw err;
    }
};