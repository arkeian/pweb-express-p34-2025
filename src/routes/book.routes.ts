import express from "express";
import { body, query } from "express-validator";
import {
    createBook,
    getAllBooks,
    getBookById,
    getBooksByGenre,
    updateBook,
    deleteBook
} from "../controllers/book.controller";
import { requireAuth } from "../middlewares/auth.middlewares";

const router = express.Router();

router.post(
    "/",
    requireAuth,
    body("title").isString().notEmpty(),
    body("writer").isString().notEmpty(),
    body("publisher").isString().notEmpty(),
    body("publicationYear").optional().isInt({ min: 1000, max: 9999 }),
    body("price").isInt({ min: 0 }),
    body("stockQuantity").isInt({ min: 0 }),
    body("genreId").isUUID(),
    body("condition").optional().isIn(["NEW", "LIKE_NEW", "VERY_GOOD", "GOOD", "ACCEPTABLE", "POOR"]),
    createBook
);

router.get(
    "/",
    requireAuth,
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    getAllBooks
);

router.get("/genre/:id", requireAuth, getBooksByGenre);
router.get("/:id", requireAuth, getBookById);
router.patch("/:id", requireAuth, body("description").optional().isString(), body("price").optional().isInt({ min: 0 }), body("stockQuantity").optional().isInt({ min: 0 }), updateBook);
router.delete("/:id", requireAuth, deleteBook);

export default router;
