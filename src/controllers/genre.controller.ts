import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { parsePagination, metaResponse } from "../utils/pagination";
import { validationResult } from "express-validator";

const prisma = new PrismaClient();

export const createGenre = async (req: Request, res: Response) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ success: false, message: "Validation error", data: errors.array() });
        }

        const { name, description } = req.body;
        const genre = await prisma.genre.create({ data: { name, description } });

        return res.status(201).json({ success: true, message: "Genre created successfully", data: { id: genre.id, name: genre.name, createdAt: genre.createdAt } });
    }
    catch (err) {
        throw err;
    }
};

export const getAllGenres = async (req: Request, res: Response) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const search = (req.query.search as string | undefined) || "";
        const orderByName = (req.query.orderByName as string | undefined) || undefined;
        const where: any = { deletedAt: null };

        if (search) {
            where.name = { contains: search, mode: "insensitive" };
        }

        const total = await prisma.genre.count({ where });
        const genres = await prisma.genre.findMany({
            where,
            orderBy: orderByName ? { name: orderByName === "asc" ? "asc" : "desc" } : { createdAt: "desc" },
            skip,
            take: limit,
            select: { id: true, name: true }
        });

        return res.json({
            success: true,
            message: "Get all genre successfully",
            data: genres,
            meta: metaResponse(page, limit, total)
        });
    }
    catch (err) {
        throw err;
    }
};

export const getGenreById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const genre = await prisma.genre.findFirst({ where: { id, deletedAt: null }, select: { id: true, name: true, description: true } });

        if (!genre) {
            return res.status(404).json({ success: false, message: "Genre not found" });
        }

        return res.json({ success: true, message: "Get genre detail successfully", data: genre });
    }
    catch (err) {
        throw err;
    }
};

export const updateGenre = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const { name, description } = req.body;

        const genreExisting = await prisma.genre.findFirst({ where: { id, deletedAt: null } });
        if (!genreExisting) {
            return res.status(404).json({ success: false, message: "Genre not found" });
        }

        const updated = await prisma.genre.update({
            where: { id },
            data: { name: name ?? genreExisting.name, description: description ?? genreExisting.description, updatedAt: new Date() }
        });

        return res.json({ success: true, message: "Genre updated successfully", data: { id: updated.id, name: updated.name, updatedAt: updated.updatedAt } });
    }
    catch (err) {
        throw err;
    }
};

export const deleteGenre = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const genre = await prisma.genre.findFirst({ where: { id, deletedAt: null } });

        if (!genre) {
            return res.status(404).json({ success: false, message: "Genre not found" });
        }

        await prisma.genre.update({ where: { id }, data: { deletedAt: new Date() } });

        return res.json({ success: true, message: "Genre removed successfully" });
    }
    catch (err) {
        throw err;
    }
};