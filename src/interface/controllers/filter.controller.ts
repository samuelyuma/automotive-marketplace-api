import Elysia from "elysia";

import type { Container } from "../../main/container";
import { cachedRead } from "../http/read-cache";
import { successResponse } from "../http/response";
import { assertNoUnknownQueryParams } from "../http/strict-query";
import {
  FilterModel,
  getCategoryFiltersRouteDetail,
  getFiltersRouteDetail,
} from "../validators/filter.validator";
import { RateLimitModel } from "../validators/response.validator";

const filterQueryKeys: ReadonlySet<string> = new Set([]);

export function createFilterController({ cache, filterService }: Container) {
  return new Elysia({ prefix: "/filters" })
    .use(FilterModel)
    .use(RateLimitModel)
    .get(
      "",
      async ({ request }) => {
        assertNoUnknownQueryParams(request, filterQueryKeys);

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
          429: "rate.limited",
          500: "filter.list.internal_error",
        },
        detail: getFiltersRouteDetail,
      },
    )
    .get(
      "/:categoryId",
      async ({ params, request }) => {
        assertNoUnknownQueryParams(request, filterQueryKeys);

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
          429: "rate.limited",
          500: "filter.category.internal_error",
        },
        detail: getCategoryFiltersRouteDetail,
      },
    );
}
