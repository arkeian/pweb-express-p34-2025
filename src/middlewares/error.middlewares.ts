import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    console.error(err);

    if (err?.code === "P2002") {
        const target = (err.meta?.target || []).join(", ");
        return res.status(409).json({ success: false, message: `Duplicate value for ${target}` });
    }
    
    const status = err.status || 500;
    const message = err.message || "Internal server error";
    res.status(status).json({ success: false, message });
}