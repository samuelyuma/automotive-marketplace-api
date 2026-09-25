import Elysia from "elysia";

import type { CategoryRepository } from "../../application/ports/category-repository.port";
import type { FilterRepository } from "../../application/ports/filter-repository.port";
import { FilterService } from "../../application/service/filter.service";
import { PgCategoryRepository } from "../../repository/postgres/category.repository";
import { PgFilterRepository } from "../../repository/postgres/filter.repository";
import {
  errorResponse,
  standardErrors,
  successResponse,
} from "../http/response";
import {
  FilterModel,
  getCategoryFiltersRouteDetail,
  getFiltersRouteDetail,
} from "../validators/filter.validator";

function unknownQueryError(request: Request) {
  if (new URL(request.url).searchParams.size === 0) return null;
  return errorResponse(
    standardErrors.validation.code,
    standardErrors.validation.message,
    [{ field: "query", issue: "Unknown query parameter" }],
  );
}

export function createFilterController(
  categoryRepository: CategoryRepository = new PgCategoryRepository(),
  filterRepository: FilterRepository = new PgFilterRepository(),
) {
  const service = new FilterService(categoryRepository, filterRepository);
  return new Elysia({ prefix: "/filters" })
    .use(FilterModel)
    .get(
      "",
      async ({ request, status }) => {
        const error = unknownQueryError(request);
        if (error) return status(400, error);
        return successResponse(await service.getGlobal(), "Filters retrieved");
      },
      {
        query: "filter.list.query",
        response: {
          200: "filter.list",
          400: "filter.list.bad_request",
          500: "filter.list.internal_error",
        },
        detail: getFiltersRouteDetail,
      },
    )
    .get(
      "/:categoryId",
      async ({ params, request, status }) => {
        const error = unknownQueryError(request);
        if (error) return status(400, error);
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
