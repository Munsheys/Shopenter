import { Query } from 'mongoose';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Apply pagination to Mongoose query
 */
export async function paginate<T>(
  query: Query<T[], any>,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<T>> {
  // Validate inputs
  page = Math.max(1, Math.floor(page) || 1);
  limit = Math.min(Math.max(1, Math.floor(limit) || 20), 100); // Cap at 100

  // Get total count
  const total = await (query.model as any).countDocuments(query.getFilter());

  // Calculate pagination
  const pages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  // Fetch paginated results
  const data = await query.skip(skip).limit(limit).lean();

  return {
    data: data as T[],
    meta: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Extract pagination params from request (Next.js)
 */
export function getPaginationParams(searchParams: Record<string, string | string[] | undefined>) {
  const page = parseInt(String(searchParams.page || '1'), 10) || 1;
  const limit = Math.min(parseInt(String(searchParams.limit || '20'), 10) || 20, 100);

  return { page, limit };
}

/**
 * Build pagination headers for response
 */
export function getPaginationHeaders(meta: PaginationMeta) {
  return {
    'X-Pagination-Page': meta.page.toString(),
    'X-Pagination-Limit': meta.limit.toString(),
    'X-Pagination-Total': meta.total.toString(),
    'X-Pagination-Pages': meta.pages.toString(),
  };
}

/**
 * Same {data, meta} shape as paginate() above, but for a DynamoDB repo call that already
 * returned the full item list (repos fetch-all via ddbQueryAll for per-merchant collections,
 * which stay small — hundreds of items, not millions). Keeps the API response contract
 * identical to the Mongoose-backed version so frontend code doesn't need to change during
 * the DynamoDB migration. Revisit with real cursor-based pagination if a merchant's
 * collection size ever makes fetch-all-then-slice expensive.
 */
export function paginateInMemory<T>(items: T[], page: number, limit: number): PaginatedResponse<T> {
  page = Math.max(1, Math.floor(page) || 1);
  limit = Math.min(Math.max(1, Math.floor(limit) || 20), 100);
  const total = items.length;
  const pages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;

  return {
    data: items.slice(start, start + limit),
    meta: { page, limit, total, pages, hasNext: page < pages, hasPrev: page > 1 },
  };
}
