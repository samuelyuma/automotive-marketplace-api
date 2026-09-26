import type { TLiteral } from "@sinclair/typebox";
import { t } from "elysia";

import {
  FUEL_TYPES,
  LISTING_CONDITIONS,
  LISTING_STATUSES,
  TRANSMISSIONS,
} from "../../../domain/entities/listing";
import { PG_INT32_MAX } from "../../../domain/postgres";
import { databaseUuidSchema } from "../uuid.validator";

type LiteralTuple<T extends readonly string[]> = T extends readonly [
  infer H extends string,
  ...infer R extends string[],
]
  ? [TLiteral<H>, ...LiteralTuple<R>]
  : [];

export function literalUnion<const T extends readonly string[]>(
  values: T,
): LiteralTuple<T> {
  return values.map((v) => t.Literal(v)) as LiteralTuple<T>;
}

export const conditionSchema = t.Union(literalUnion(LISTING_CONDITIONS));
export const fuelTypeSchema = t.Union(literalUnion(FUEL_TYPES));
export const transmissionSchema = t.Union(literalUnion(TRANSMISSIONS));
export const submittedAttributesSchema = t.Array(
  t.Object(
    {
      attribute_definition_id: databaseUuidSchema,
      value: t.Union([t.String(), t.Number(), t.Boolean()]),
    },
    { additionalProperties: false },
  ),
);
export const listingAttributesSchema = t.Array(
  t.Object({
    key: t.String(),
    label: t.String(),
    value: t.Union([t.String(), t.Number(), t.Boolean()]),
  }),
);

export const listingFields = {
  category_id: databaseUuidSchema,
  make: t.String({ minLength: 1 }),
  model: t.String({ minLength: 1 }),
  year: t.Integer({ minimum: 1900, maximum: 2100 }),
  price: t.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  mileage: t.Integer({ minimum: 0, maximum: PG_INT32_MAX }),
  condition: conditionSchema,
  color: t.String({ minLength: 1 }),
  location: t.String({ minLength: 1 }),
};

export const listingResponseFields = {
  id: databaseUuidSchema,
  ...listingFields,
  status: t.Optional(t.Union(literalUnion(LISTING_STATUSES))),
  image_url: t.Nullable(t.String()),
  fuel_type: t.Nullable(fuelTypeSchema),
  transmission: t.Nullable(transmissionSchema),
  engine_cc: t.Nullable(t.Integer()),
};
