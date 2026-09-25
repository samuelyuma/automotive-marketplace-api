import { t } from "elysia";

import { databaseUuidSchema } from "../uuid.validator";

export const conditionSchema = t.Union([
  t.Literal("NEW"),
  t.Literal("USED"),
  t.Literal("CERTIFIED"),
]);
export const statusSchema = t.Union([
  t.Literal("AVAILABLE"),
  t.Literal("PENDING"),
  t.Literal("SOLD"),
  t.Literal("REMOVED"),
]);
export const fuelTypeSchema = t.Union([
  t.Literal("PETROL"),
  t.Literal("DIESEL"),
  t.Literal("HYBRID"),
  t.Literal("ELECTRIC"),
]);
export const transmissionSchema = t.Union([
  t.Literal("MANUAL"),
  t.Literal("AUTOMATIC"),
]);

export const listingFields = {
  category_id: databaseUuidSchema,
  make: t.String({ minLength: 1 }),
  model: t.String({ minLength: 1 }),
  year: t.Integer({ minimum: 1900, maximum: 2100 }),
  price: t.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  mileage: t.Integer({ minimum: 0, maximum: 2147483647 }),
  condition: conditionSchema,
  color: t.String({ minLength: 1 }),
  location: t.String({ minLength: 1 }),
};

export const listingResponseFields = {
  id: databaseUuidSchema,
  ...listingFields,
  status: statusSchema,
  image_url: t.Nullable(t.String()),
  fuel_type: t.Nullable(fuelTypeSchema),
  transmission: t.Nullable(transmissionSchema),
  engine_cc: t.Nullable(t.Integer()),
};
