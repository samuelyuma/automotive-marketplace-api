import Elysia from "elysia";

import type { CachePort } from "../../application/ports/cache.port";
import type { ListingRepository } from "../../application/ports/listing-repository.port";
import type { ListingSearchRepository } from "../../application/ports/listing-search-repository.port";
import { ListingService } from "../../application/service/listing.service";
import { ListingSearchService } from "../../application/service/listing-search.service";
import type { Listing } from "../../domain/entities/listing";
import { RedisCache } from "../../infrastructure/redis/cache";
import { PgListingRepository } from "../../repository/postgres/listing.repository";
import { PgListingSearchRepository } from "../../repository/postgres/listing-search.repository";
import { cachedRead, invalidateReadCache } from "../http/read-cache";
import { paginatedResponse, successResponse } from "../http/response";
import { serializeListingDetail } from "../http/serialize-listing-detail";
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

function serializeListingFields(listing: Listing) {
  return {
    id: listing.id,
    category_id: listing.category_id,
    make: listing.make,
    model: listing.model,
    year: listing.year,
    price: listing.price,
    mileage: listing.mileage,
    condition: listing.condition,
    color: listing.color,
    location: listing.location,
    status: listing.status,
    image_url: listing.image_url,
    fuel_type: listing.fuel_type,
    transmission: listing.transmission,
    engine_cc: listing.engine_cc,
  };
}

function serializeCreatedListing(listing: Listing) {
  return {
    ...serializeListingFields(listing),
    created_at: listing.created_at.toISOString(),
  };
}

function serializeUpdatedListing(listing: Listing) {
  return {
    ...serializeListingFields(listing),
    updated_at: listing.updated_at.toISOString(),
  };
}

export function createListingController(
  repository: ListingRepository = new PgListingRepository(),
  searchRepository: ListingSearchRepository = new PgListingSearchRepository(),
  cache?: CachePort,
) {
  const listingService = new ListingService(repository, cache);
  const searchService = new ListingSearchService(searchRepository);

  return new Elysia({ prefix: "/listings" })
    .use(CreateListingModel)
    .use(UpdateListingModel)
    .use(DeleteListingModel)
    .use(ListListingsModel)
    .use(GetListingModel)
    .get(
      "",
      async ({ query, request }) =>
        cachedRead(cache, request, async () => {
          const page = await searchService.list({
            ...query,
            sort: query.sort ?? "created_at",
            direction: query.direction ?? "desc",
            per_page: query.per_page ?? 20,
          });
          return paginatedResponse(
            page.data.map(serializeListingDetail),
            "Listings retrieved",
            page.meta,
            page.facets,
          );
        }),
      {
        query: "listing.list.query",
        response: {
          200: "listing.list",
          400: "listing.list.bad_request",
          500: "listing.list.internal_error",
        },
        detail: listListingsRouteDetail,
      },
    )
    .get(
      "/:id",
      async ({ params }) =>
        successResponse(
          serializeListingDetail(await listingService.getById(params.id)),
          "Listing retrieved",
        ),
      {
        params: "listing.detail.params",
        response: {
          200: "listing.detail",
          400: "listing.detail.bad_request",
          404: "listing.detail.not_found",
          500: "listing.detail.internal_error",
        },
        detail: getListingRouteDetail,
      },
    )
    .post(
      "",
      async ({ body, status }) => {
        const listing = await listingService.create(body);
        await invalidateReadCache(cache);
        return status(
          201,
          successResponse(serializeCreatedListing(listing), "Listing created"),
        );
      },
      {
        body: "listing.create.body",
        response: {
          201: "listing.created",
          400: "listing.bad_request",
          422: "listing.category_not_found",
          500: "listing.internal_error",
        },
        detail: createListingRouteDetail,
      },
    )
    .patch(
      "/:id",
      async ({ params, body }) => {
        const listing = await listingService.update(params.id, body);
        await invalidateReadCache(cache);
        return successResponse(
          serializeUpdatedListing(listing),
          "Listing updated",
        );
      },
      {
        params: "listing.update.params",
        body: "listing.update.body",
        response: {
          200: "listing.updated",
          400: "listing.bad_request",
          404: "listing.not_found",
          422: "listing.update.category_not_found",
          500: "listing.internal_error",
        },
        detail: updateListingRouteDetail,
      },
    )
    .delete(
      "/:id",
      async ({ params }) => {
        const listing = await listingService.softDelete(params.id);
        await invalidateReadCache(cache);
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
          500: "listing.internal_error",
        },
        detail: deleteListingRouteDetail,
      },
    );
}

export const listingController = createListingController(
  undefined,
  undefined,
  new RedisCache(),
);
