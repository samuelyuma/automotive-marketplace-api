import Elysia from "elysia";

import type { ListingRepository } from "@application/ports/listing-repository.port";
import { ListingService } from "@application/service/listing.service";
import { InvalidListingSearchQueryError } from "@application/utils/listing-search";

import type { Listing } from "@domain/entities/listing";

import { paginatedResponse, successResponse } from "@interface/http/response";
import { serializeListingDetail } from "@interface/http/serialize-listing-detail";
import {
  CreateListingModel,
  createListingRouteDetail,
} from "@interface/validators/listing/create-listing.validator";
import {
  DeleteListingModel,
  deleteListingRouteDetail,
} from "@interface/validators/listing/delete-listing.validator";
import {
  GetListingModel,
  getListingRouteDetail,
} from "@interface/validators/listing/get-listing.validator";
import {
  ListListingsModel,
  listListingsRouteDetail,
} from "@interface/validators/listing/list-listings.validator";
import {
  SearchListingsModel,
  searchListingsRouteDetail,
} from "@interface/validators/listing/search-listings.validator";
import {
  UpdateListingModel,
  updateListingRouteDetail,
} from "@interface/validators/listing/update-listing.validator";

import { PgListingRepository } from "@repository/postgres/listing.repository";

const searchQueryKeys = new Set([
  "q",
  "category_id",
  "make",
  "model",
  "condition",
  "fuel_type",
  "transmission",
  "price_min",
  "price_max",
  "year_min",
  "year_max",
  "mileage_min",
  "mileage_max",
  "location",
  "sort",
  "direction",
  "per_page",
  "cursor",
]);

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
) {
  const listingService = new ListingService(repository);

  return new Elysia({ prefix: "/listings" })
    .use(CreateListingModel)
    .use(UpdateListingModel)
    .use(DeleteListingModel)
    .use(ListListingsModel)
    .use(SearchListingsModel)
    .use(GetListingModel)
    .get(
      "",
      async ({ query }) => {
        const page = await listingService.list({
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
      },
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
      "/search",
      async ({ query, request }) => {
        const unknown = [...new URL(request.url).searchParams.keys()].find(
          (key) => !searchQueryKeys.has(key),
        );
        if (unknown !== undefined)
          throw new InvalidListingSearchQueryError(unknown);
        const page = await listingService.search({
          q: query.q,
          category_id: query.category_id,
          make: query.make,
          model: query.model,
          condition: query.condition,
          fuel_type: query.fuel_type,
          transmission: query.transmission,
          min_price: query.price_min,
          max_price: query.price_max,
          min_year: query.year_min,
          max_year: query.year_max,
          min_mileage: query.mileage_min,
          max_mileage: query.mileage_max,
          location: query.location,
          sort: query.sort,
          direction: query.direction,
          per_page: query.per_page,
          cursor: query.cursor,
        });
        return paginatedResponse(
          page.data.map(serializeListingDetail),
          "Listings found",
          page.meta,
        );
      },
      {
        query: "listing.search.query",
        response: {
          200: "listing.search",
          400: "listing.search.bad_request",
          500: "listing.search.internal_error",
        },
        detail: searchListingsRouteDetail,
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
      async ({ params, body }) =>
        successResponse(
          serializeUpdatedListing(await listingService.update(params.id, body)),
          "Listing updated",
        ),
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

export const listingController = createListingController();
