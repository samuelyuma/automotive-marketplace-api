import { type TSchema, t } from "elysia";

import { errorResponse, standardErrors } from "../http/response";

export const successSchema = <T extends TSchema>(data: T) =>
  t.Object({
    success: t.Literal(true),
    message: t.String(),
    data,
  });

export const paginationMetaSchema = t.Object({
  per_page: t.Integer({ minimum: 1 }),
  next_cursor: t.Nullable(t.String()),
  prev_cursor: t.Optional(t.Nullable(t.String())),
  total_records: t.Optional(t.Integer({ minimum: 0 })),
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
