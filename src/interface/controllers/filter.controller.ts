import Elysia from "elysia";

import type { Container } from "../../main/container";
import { cachedRead } from "../http/read-cache";
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

export function createFilterController({ cache, filterService }: Container) {
  return new Elysia({ prefix: "/filters" })
    .use(FilterModel)
    .get(
      "",
      async ({ request, status }) => {
        const error = unknownQueryError(request);
        if (error) return status(400, error);
        return cachedRead(
          cache,
          request,
          async () =>
            successResponse(
              await filterService.getGlobal(),
              "Filters retrieved",
            ),
          { resource: ["filters", "listings"], ttlSeconds: 300 },
        );
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
        return cachedRead(
          cache,
          request,
          async () =>
            successResponse(
              await filterService.getForCategory(params.categoryId),
              "Category filters retrieved",
            ),
          { resource: ["filters", "categories", "listings"], ttlSeconds: 300 },
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
