import Elysia from "elysia";

import { CategoryNotFoundError } from "../../../domain/errors/category-error";
import { badRequestSchema, errorSchema } from "../response.validator";

export const CategoryErrorsModel = new Elysia().model({
  "category.bad_request": badRequestSchema,
  "category.not_found": errorSchema(new CategoryNotFoundError()),
});
