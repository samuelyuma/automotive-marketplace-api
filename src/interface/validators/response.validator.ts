import Elysia, { type TSchema, t } from "elysia";

import { errorResponse, standardErrors } from "../http/response";

type TimestampKey = "created_at" | "updated_at";

export function withTimestamps<
  const T extends Record<string, TSchema>,
  const K extends readonly TimestampKey[],
>(
  fields: T,
  ...keys: K
): T & { [key in K[number]]: ReturnType<typeof t.String> } {
  return Object.assign(
    {},
    fields,
    Object.fromEntries(
      keys.map((key) => [key, t.String({ format: "date-time" })]),
    ),
  ) as T & { [key in K[number]]: ReturnType<typeof t.String> };
}

export const successSchema = <T extends TSchema>(data: T) =>
  t.Object({
    success: t.Literal(true),
    message: t.String(),
    data,
  });

export const paginationMetaSchema = t.Object({
  per_page: t.Integer({ minimum: 1 }),
  next_cursor: t.Nullable(t.String()),
});

export const paginatedSuccessSchema = <D extends TSchema, F extends TSchema>(
  data: D,
  facets?: F,
) =>
  t.Object({
    success: t.Literal(true),
    message: t.String(),
    data,
    meta: paginationMetaSchema,
    ...(facets === undefined ? {} : { facets }),
  });

export const errorSchema = (error: { code: string; message: string }) =>
  t.Object(
    {
      success: t.Literal(false),
      message: t.Literal(error.message),
      error: t.Object({
        code: t.Literal(error.code),
        details: t.Optional(
          t.Array(
            t.Object({
              field: t.String(),
              issue: t.String(),
            }),
          ),
        ),
      }),
    },
    { examples: [errorResponse(error.code, error.message)] },
  );

export const standardErrorSchema = (kind: keyof typeof standardErrors) =>
  errorSchema(standardErrors[kind]);

export const badRequestSchema = t.Union([
  standardErrorSchema("validation"),
  standardErrorSchema("parse"),
]);

export const internalErrorSchema = standardErrorSchema("internal");

export const rateLimitedSchema = standardErrorSchema("rateLimited");

// Shared by every route: the global rate-limit plugin can 429 any request.
export const RateLimitModel = new Elysia().model({
  "rate.limited": rateLimitedSchema,
});
