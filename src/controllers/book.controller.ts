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

        const currentYear = new Date().getFullYear();

        if (publicationYear !== undefined && publicationYear !== null) {
            if (!Number.isInteger(publicationYear)) {
                return res.status(422).json({
                    success: false,
                    message: "Validation error",
                    data: [{ msg: "publicationYear must be an integer", path: "publicationYear", location: "body" }]
                });
            }
            if (publicationYear <= 0 || publicationYear > currentYear) {
                return res.status(422).json({
                    success: false,
                    message: "Validation error",
                    data: [{ msg: `publicationYear must be between 1 and ${currentYear}`, path: "publicationYear", location: "body" }]
                });
            }
        }

        if (price === undefined || price === null) {
            return res.status(422).json({
                success: false,
                message: "Validation error",
                data: [{ msg: "price is required", path: "price", location: "body" }]
            });
        }
        if (!Number.isInteger(price) || price <= 0) {
            return res.status(422).json({
                success: false,
                message: "Validation error",
                data: [{ msg: "price must be an integer greater than 0", path: "price", location: "body" }]
            });
        }

        if (stockQuantity === undefined || stockQuantity === null) {
            return res.status(422).json({
                success: false,
                message: "Validation error",
                data: [{ msg: "stockQuantity is required", path: "stockQuantity", location: "body" }]
            });
        }
        if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
            return res.status(422).json({
                success: false,
                message: "Validation error",
                data: [{ msg: "stockQuantity must be an integer >= 0", path: "stockQuantity", location: "body" }]
            });
        }

        const genre = await prisma.genre.findFirst({ where: { id: genreId, deletedAt: null } });

        if (!genre) {
            return res.status(404).json({ success: false, message: "Genre not found" });
        }

        const existingBook = await prisma.book.findFirst({ where: { title, writer, publisher, deletedAt: null } });

        if (existingBook) {
            if (existingBook.deletedAt === null) {
                return res.status(409).json({ success: false, message: "Book title already exists" });
            }

            const restored = await prisma.book.update({
                where: { id: existingBook.id },
                data: {
                    deletedAt: null,
                    updatedAt: new Date(),
                    writer,
                    publisher,
                    isbn,
                    description,
                    publicationYear,
                    condition,
                    price,
                    stockQuantity,
                    genreId,
                },
            });

            return res.status(200).json({
                success: true,
                message: "Book restored successfully",
                data: restored,
            });
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
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error" });
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
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error" });
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
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error" });
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
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const updateBook = async (req: Request, res: Response) => {
    try {
        const id = req.params.book_id || req.params.id;
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
            genreId,
        } = req.body;

        const bookExisting = await prisma.book.findFirst({ where: { id } });

        if (!bookExisting) {
            return res
                .status(404)
                .json({ success: false, message: "Book not found" });
        }

        if (bookExisting.deletedAt !== null) {
            return res.status(409).json({ success: false, message: "This book has been deleted. Please recreate it using POST to restore it first" });
        }

        if (title && title !== bookExisting.title) {
            const duplicate = await prisma.book.findFirst({
                where: {
                    title,
                    deletedAt: null,
                    NOT: { id },
                },
            });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message: "Book title already exists",
                });
            }
        }

        const updated = await prisma.book.update({
            where: { id },
            data: {
                title: title ?? bookExisting.title,
                writer: writer ?? bookExisting.writer,
                publisher: publisher ?? bookExisting.publisher,
                isbn: isbn ?? bookExisting.isbn,
                description: description ?? bookExisting.description,
                publicationYear:
                    publicationYear ?? bookExisting.publicationYear,
                condition: condition ?? bookExisting.condition,
                price: price ?? bookExisting.price,
                stockQuantity: stockQuantity ?? bookExisting.stockQuantity,
                genreId: genreId ?? bookExisting.genreId,
                updatedAt: new Date(),
            },
        });

        return res.json({
            success: true,
            message: "Book updated successfully",
            data: {
                id: updated.id,
                title: updated.title,
                writer: updated.writer,
                publisher: updated.publisher,
                isbn: updated.isbn,
                description: updated.description,
                publicationYear: updated.publicationYear,
                condition: updated.condition,
                price: updated.price,
                stockQuantity: updated.stockQuantity,
                genreId: updated.genreId,
                updatedAt: updated.updatedAt,
            },
        });
    }
    catch (err) {
        console.error(err);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
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
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};