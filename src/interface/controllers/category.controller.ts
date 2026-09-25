import Elysia from "elysia";

import type { Container } from "../../main/container";
import { cachedRead, invalidateReadCache } from "../http/read-cache";
import { paginatedResponse, successResponse } from "../http/response";
import {
  toCategoryDetail,
  toCategoryTree,
  toCreatedCategory,
  toUpdatedCategory,
} from "../presenters/category.presenter";
import { toListingDetail } from "../presenters/listing.presenter";
import {
  CreateCategoryModel,
  createCategoryRouteDetail,
} from "../validators/category/create-category.validator";
import {
  GetCategoryModel,
  getCategoryRouteDetail,
} from "../validators/category/get-category.validator";
import {
  ListCategoryModel,
  listCategoryRouteDetail,
} from "../validators/category/list-category.validator";
import {
  UpdateCategoryModel,
  updateCategoryRouteDetail,
} from "../validators/category/update-category.validator";
import {
  ListListingsModel,
  listCategoryListingsRouteDetail,
} from "../validators/listing/list-listings.validator";

export function createCategoryController({
  cache,
  categoryService,
  listingSearchService,
}: Container) {
  return new Elysia({ prefix: "/categories" })
    .use(CreateCategoryModel)
    .use(GetCategoryModel)
    .use(ListCategoryModel)
    .use(UpdateCategoryModel)
    .use(ListListingsModel)
    .get(
      "",
      async ({ request }) =>
        cachedRead(
          cache,
          request,
          async () =>
            successResponse(
              toCategoryTree(await categoryService.listTree()),
              "Categories retrieved",
            ),
          { resource: "categories", ttlSeconds: 300 },
        ),
      {
        response: {
          200: "category.tree",
          500: "category.internal_error",
        },
        detail: listCategoryRouteDetail,
      },
    )
    .get(
      "/:id/listings",
      async ({ params, query, request }) =>
        cachedRead(
          cache,
          request,
          async () => {
            await categoryService.getWithChildren(params.id);
            const page = await listingSearchService.list({
              ...query,
              scope_category_id: params.id,
              sort: query.sort ?? "created_at",
              direction: query.direction ?? "desc",
              per_page: query.per_page ?? 20,
            });
            return paginatedResponse(
              page.data.map(toListingDetail),
              "Listings retrieved",
              page.meta,
              page.facets,
            );
          },
          { resource: ["categories", "listings"], ttlSeconds: 60 },
        ),
      {
        params: "category.detail.params",
        query: "listing.list.query",
        response: {
          200: "listing.list",
          400: "listing.list.bad_request",
          404: "category.not_found",
          500: "listing.list.internal_error",
        },
        detail: listCategoryListingsRouteDetail,
      },
    )
    .get(
      "/:id",
      async ({ params, request }) =>
        cachedRead(
          cache,
          request,
          async () =>
            successResponse(
              toCategoryDetail(
                await categoryService.getWithChildren(params.id),
              ),
              "Category retrieved",
            ),
          { resource: "categories", ttlSeconds: 300 },
        ),
      {
        params: "category.detail.params",
        response: {
          200: "category.detail",
          400: "category.bad_request",
          404: "category.not_found",
          500: "category.internal_error",
        },
        detail: getCategoryRouteDetail,
      },
    )
    .post(
      "",
      async ({ body, status }) => {
        const category = await categoryService.create({
          ...body,
          parent_id: body.parent_id ?? null,
        });
        await invalidateReadCache(cache, ["categories", "filters", "listings"]);
        return status(
          201,
          successResponse(toCreatedCategory(category), "Category created"),
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
        await invalidateReadCache(cache, ["categories", "filters", "listings"]);
        return successResponse(toUpdatedCategory(category), "Category updated");
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
