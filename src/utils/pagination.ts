export function parsePagination(query: any) {
    const page = Math.max(1, parseInt(query.page as string || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit as string || "10", 10)));
    const skip = (page - 1) * limit;
    
    return { page, limit, skip };
}

export function metaResponse(page: number, limit: number, total: number) {
    const totalPages = Math.ceil(total / limit);

    return {
        page: page,
        limit: limit,
        prev: page > 1 ? page - 1 : null,
        next: page < totalPages ? page + 1 : null,
        total: total,
        totalPages: totalPages
    };
}