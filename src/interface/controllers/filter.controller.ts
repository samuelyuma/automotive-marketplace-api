import Elysia from "elysia";

import type { CategoryFilterRepository } from "@application/ports/category-filter-repository.port";
import type { CategoryRepository } from "@application/ports/category-repository.port";
import { CategoryFilterService } from "@application/service/category-filter.service";

import {
  errorResponse,
  standardErrors,
  successResponse,
} from "@interface/http/response";
import {
  GetCategoryFiltersModel,
  getCategoryFiltersRouteDetail,
} from "@interface/validators/filter/get-category-filters.validator";

import { PgCategoryRepository } from "@repository/postgres/category.repository";
import { PgCategoryFilterRepository } from "@repository/postgres/category-filter.repository";

export function createFilterController(
  categoryRepository: CategoryRepository = new PgCategoryRepository(),
  filterRepository: CategoryFilterRepository = new PgCategoryFilterRepository(),
) {
  const service = new CategoryFilterService(
    categoryRepository,
    filterRepository,
  );
  return new Elysia({ prefix: "/filters" }).use(GetCategoryFiltersModel).get(
    "/:categoryId",
    async ({ params, request, status }) => {
      if (new URL(request.url).searchParams.size > 0)
        return status(
          400,
          errorResponse(
            standardErrors.validation.code,
            standardErrors.validation.message,
            [{ field: "query", issue: "Unknown query parameter" }],
          ),
        );
      return successResponse(
        await service.getForCategory(params.categoryId),
        "Category filters retrieved",
      );
    },
    {
      params: "filter.category.params",
      query: "filter.category.query",
      response: {
        200: "filter.category",
        400: "filter.category.bad_request",
        404: "filter.category.not_found",
        500: "filter.category.internal_error",
      },
      detail: getCategoryFiltersRouteDetail,
    },
  );
}

export const filterController = createFilterController();
