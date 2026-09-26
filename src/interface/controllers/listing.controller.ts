import Elysia from "elysia";

import type { Container } from "../../main/container";
import { cachedRead, invalidateReadCache } from "../http/read-cache";
import { paginatedResponse, successResponse } from "../http/response";
import {
  assertNoUnknownQueryParams,
  listingBrowseQueryKeys,
} from "../http/strict-query";
import {
  toCreatedListing,
  toListingDetail,
  toUpdatedListing,
} from "../presenters/listing.presenter";
import {
  CreateListingModel,
  createListingRouteDetail,
} from "../validators/listing/create-listing.validator";
import {
  DeleteListingModel,
  deleteListingRouteDetail,
} from "../validators/listing/delete-listing.validator";
import {
  GetListingModel,
  getListingRouteDetail,
} from "../validators/listing/get-listing.validator";
import {
  ListListingsModel,
  listListingsRouteDetail,
} from "../validators/listing/list-listings.validator";
import {
  UpdateListingModel,
  updateListingRouteDetail,
} from "../validators/listing/update-listing.validator";
import { RateLimitModel } from "../validators/response.validator";

export function createListingController({
  cache,
  listingService,
  listingSearchService,
}: Container) {
  return new Elysia({ prefix: "/listings" })
    .use(CreateListingModel)
    .use(UpdateListingModel)
    .use(DeleteListingModel)
    .use(ListListingsModel)
    .use(GetListingModel)
    .use(RateLimitModel)
    .get(
      "",
      async ({ query, request }) => {
        assertNoUnknownQueryParams(request, listingBrowseQueryKeys);

        return cachedRead(
          cache,
          request,
          async () => {
            const page = await listingSearchService.list({
              ...query,
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
          { resource: "listings", ttlSeconds: 60 },
        );
      },
      {
        query: "listing.list.query",
        response: {
          200: "listing.list",
          400: "listing.list.bad_request",
          429: "rate.limited",
          500: "listing.list.internal_error",
        },
        detail: listListingsRouteDetail,
      },
    )
    .get(
      "/:id",
      async ({ params }) =>
        successResponse(
          toListingDetail(await listingService.getById(params.id)),
          "Listing retrieved",
        ),
      {
        params: "listing.detail.params",
        response: {
          200: "listing.detail",
          400: "listing.detail.bad_request",
          404: "listing.detail.not_found",
          429: "rate.limited",
          500: "listing.detail.internal_error",
        },
        detail: getListingRouteDetail,
      },
    )
    .post(
      "",
      async ({ body, status }) => {
        const listing = await listingService.create(body);
        await invalidateReadCache(cache, ["listings"]);
        return status(
          201,
          successResponse(toCreatedListing(listing), "Listing created"),
        );
      },
      {
        body: "listing.create.body",
        response: {
          201: "listing.created",
          400: "listing.bad_request",
          422: "listing.category_not_found",
          429: "rate.limited",
          500: "listing.internal_error",
        },
        detail: createListingRouteDetail,
      },
    )
    .patch(
      "/:id",
      async ({ params, body }) => {
        const listing = await listingService.update(params.id, body);
        await invalidateReadCache(cache, ["listings"]);
        return successResponse(toUpdatedListing(listing), "Listing updated");
      },
      {
        params: "listing.update.params",
        body: "listing.update.body",
        response: {
          200: "listing.updated",
          400: "listing.bad_request",
          404: "listing.not_found",
          422: "listing.update.category_not_found",
          429: "rate.limited",
          500: "listing.internal_error",
        },
        detail: updateListingRouteDetail,
      },
    )
    .delete(
      "/:id",
      async ({ params }) => {
        const listing = await listingService.softDelete(params.id);
        await invalidateReadCache(cache, ["listings"]);
        return successResponse(
          {
            id: listing.id,
            status: listing.status,
            updated_at: listing.updated_at.toISOString(),
          },
          "Listing deleted",
        );
      },
      {
        params: "listing.delete.params",
        response: {
          200: "listing.deleted",
          400: "listing.bad_request",
          404: "listing.not_found",
          429: "rate.limited",
          500: "listing.internal_error",
        },
        detail: deleteListingRouteDetail,
      },
    );
}
