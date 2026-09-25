import Elysia, { t } from "elysia";

import {
  badRequestSchema,
  internalErrorSchema,
  successSchema,
} from "../response.validator";

const suggestionTypeSchema = t.Union([
  t.Literal("make"),
  t.Literal("model"),
  t.Literal("location"),
]);

export const SuggestListingsModel = new Elysia().model({
  "listing.suggest.query": t.Object(
    {
      q: t.String({ minLength: 2, maxLength: 100 }),
      type: t.Optional(suggestionTypeSchema),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 20, multipleOf: 1 })),
    },
    { additionalProperties: false },
  ),
  "listing.suggest": successSchema(
    t.Array(t.Object({ type: suggestionTypeSchema, value: t.String() })),
  ),
  "listing.suggest.bad_request": badRequestSchema,
  "listing.suggest.internal_error": internalErrorSchema,
});

export const suggestListingsRouteDetail = {
  summary: "Suggest Listing Search Terms",
  description:
    "Returns up to 10 case-insensitive, distinct prefix suggestions across available listing makes, models, and locations. Pass type to limit the field and limit up to 20 to adjust the result count.",
  tags: ["Listing"],
};
