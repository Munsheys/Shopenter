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
