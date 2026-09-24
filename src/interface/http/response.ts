export type SuccessResponse<T = undefined> = {
  success: true;
  message: string;
  data?: T;
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
} as const;

export function successResponse<T>(data: T, message: string) {
  return { success: true as const, message, data };
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
