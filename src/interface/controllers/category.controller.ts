import Elysia from "elysia";

import type { CategoryRepository } from "@application/ports/category-repository.port";
import { CategoryService } from "@application/service/category.service";

import { successResponse } from "@interface/http/response";
import {
  CreateCategoryModel,
  createCategoryRouteDetail,
} from "@interface/validators/category/create-category.validator";

import { PgCategoryRepository } from "@repository/postgres/category.repository";

export function createCategoryController(
  repository: CategoryRepository = new PgCategoryRepository(),
) {
  const categoryService = new CategoryService(repository);

  return new Elysia({ prefix: "/categories" }).use(CreateCategoryModel).post(
    "",
    async ({ body, status }) => {
      const category = await categoryService.create({
        ...body,
        parent_id: body.parent_id ?? null,
      });
      return status(
        201,
        successResponse(
          {
            ...category,
            created_at: category.created_at.toISOString(),
            updated_at: category.updated_at.toISOString(),
          },
          "Category created",
        ),
      );
    },
    {
      body: "category.create.body",
      response: {
        201: "category.created",
        400: "category.bad_request",
        409: "category.slug_conflict",
        422: "category.parent_not_found",
        500: "category.internal_error",
      },
      detail: createCategoryRouteDetail,
    },
  );
}

export const categoryController = createCategoryController();
