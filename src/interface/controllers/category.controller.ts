import Elysia from "elysia";

import type { CategoryRepository } from "@application/ports/category-repository.port";
import { CategoryService } from "@application/service/category.service";

import type {
  CategoryWithAttributes,
  UpdatedCategoryWithAttributes,
} from "@domain/entities/category";

import { successResponse } from "@interface/http/response";
import {
  CreateCategoryModel,
  createCategoryRouteDetail,
} from "@interface/validators/category/create-category.validator";
import {
  UpdateCategoryModel,
  updateCategoryRouteDetail,
} from "@interface/validators/category/update-category.validator";

import { PgCategoryRepository } from "@repository/postgres/category.repository";

function serializeCreatedCategory(category: CategoryWithAttributes) {
  return {
    id: category.id,
    parent_id: category.parent_id,
    name: category.name,
    slug: category.slug,
    created_at: category.created_at.toISOString(),
    attributes: category.attributes.map((attribute) => ({
      id: attribute.id,
      category_id: attribute.category_id,
      key: attribute.key,
      label: attribute.label,
      type: attribute.type,
      options: attribute.options,
      created_at: attribute.created_at.toISOString(),
    })),
  };
}

function serializeUpdatedCategory(category: UpdatedCategoryWithAttributes) {
  return {
    id: category.id,
    parent_id: category.parent_id,
    name: category.name,
    slug: category.slug,
    updated_at: category.updated_at.toISOString(),
    attributes: [
      ...category.attributes.map((attribute) => ({
        id: attribute.id,
        category_id: attribute.category_id,
        key: attribute.key,
        label: attribute.label,
        type: attribute.type,
        options: attribute.options,
        updated_at: attribute.updated_at.toISOString(),
      })),
      ...category.deleted_attributes.map((attribute) => ({
        id: attribute.id,
        deleted_at: attribute.deleted_at.toISOString(),
      })),
    ],
  };
}

export function createCategoryController(
  repository: CategoryRepository = new PgCategoryRepository(),
) {
  const categoryService = new CategoryService(repository);

  return new Elysia({ prefix: "/categories" })
    .use(CreateCategoryModel)
    .use(UpdateCategoryModel)
    .post(
      "",
      async ({ body, status }) => {
        const category = await categoryService.create({
          ...body,
          parent_id: body.parent_id ?? null,
        });
        return status(
          201,
          successResponse(
            serializeCreatedCategory(category),
            "Category created",
          ),
        );
      },
      {
        body: "category.create.body",
        response: {
          201: "category.created",
          400: "category.bad_request",
          409: "category.conflict",
          422: "category.parent_not_found",
          500: "category.internal_error",
        },
        detail: createCategoryRouteDetail,
      },
    )
    .patch(
      "/:id",
      async ({ params, body }) => {
        const category = await categoryService.update(params.id, body);
        return successResponse(
          serializeUpdatedCategory(category),
          "Category updated",
        );
      },
      {
        params: "category.update.params",
        body: "category.update.body",
        response: {
          200: "category.updated",
          400: "category.bad_request",
          404: "category.not_found",
          409: "category.conflict",
          422: "category.update.invalid_parent",
          500: "category.internal_error",
        },
        detail: updateCategoryRouteDetail,
      },
    );
}

export const categoryController = createCategoryController();
