export type SuccessResponse<T = undefined> = {
  success: true;
  message: string;
  data?: T;
};

export type PaginationMeta = {
  per_page: number;
  next_cursor: string | null;
};

export type ErrorDetail = { field: string; issue: string };

export type ErrorResponse = {
  success: false;
  message: string;
  error: { code: string; details?: ErrorDetail[] };
};

export const standardErrors = {
  validation: {
    code: "VALIDATION_ERROR",
    message: "Request validation failed",
  },
  parse: {
    code: "PARSE_ERROR",
    message: "Malformed request body",
  },
  notFound: {
    code: "NOT_FOUND",
    message: "Route not found",
  },
  internal: {
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong",
  },
  rateLimited: {
    code: "RATE_LIMITED",
    message: "Too many requests",
  },
} as const;

export function successResponse<T>(data: T, message: string) {
  return { success: true as const, message, data };
}

export type PaginatedResponse<T, F extends object | undefined = undefined> = {
  success: true;
  message: string;
  data: T[];
  meta: PaginationMeta;
} & ([F] extends [undefined] ? unknown : { facets: F });

export function paginatedResponse<T, F extends object>(
  data: T[],
  message: string,
  meta: PaginationMeta,
  facets: F,
): PaginatedResponse<T, F>;

export function paginatedResponse<T>(
  data: T[],
  message: string,
  meta: PaginationMeta,
): PaginatedResponse<T>;

export function paginatedResponse<T, F extends object>(
  data: T[],
  message: string,
  meta: PaginationMeta,
  facets?: F,
) {
  return {
    success: true as const,
    message,
    data,
    meta,
    ...(facets === undefined ? {} : { facets }),
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: ErrorDetail[],
): ErrorResponse {
  return {
    success: false,
    message,
    error: { code, ...(details ? { details } : {}) },
  };
}
