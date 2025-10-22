import express from "express";
import { body, query } from "express-validator";
import { createGenre, getAllGenres, getGenreById, updateGenre, deleteGenre } from "../controllers/genre.controller";
import { requireAuth } from "../middlewares/auth.middlewares";

const router = express.Router();

router.post(
    "/",
    requireAuth,
    body("name").isString().notEmpty().withMessage("name is required"),
    createGenre
);

router.get(
    "/",
    requireAuth,
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    getAllGenres
);

router.get("/:id", requireAuth, getGenreById);
router.patch("/:id", requireAuth, body("name").optional().isString(), updateGenre);
router.delete("/:id", requireAuth, deleteGenre);

export default router;
