import Elysia from "elysia";

import type { ListingSearchRepository } from "@application/ports/listing-search-repository.port";
import { ListingSearchService } from "@application/service/listing-search.service";
import { InvalidListingSearchQueryError } from "@application/utils/listing-search";

import { paginatedResponse, successResponse } from "@interface/http/response";
import { serializeListingDetail } from "@interface/http/serialize-listing-detail";
import {
  SearchListingsModel,
  searchListingsRouteDetail,
} from "@interface/validators/listing-search.validator";
import {
  SuggestListingsModel,
  suggestListingsRouteDetail,
} from "@interface/validators/listing-suggest.validator";

import { PgListingSearchRepository } from "@repository/postgres/listing-search.repository";

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
const suggestQueryKeys = new Set(["q", "type", "limit"]);

export function createListingSearchController(
  repository: ListingSearchRepository = new PgListingSearchRepository(),
) {
  const searchService = new ListingSearchService(repository);

  return new Elysia({ prefix: "/listings/search" })
    .use(SearchListingsModel)
    .use(SuggestListingsModel)
    .get(
      "/suggest",
      async ({ query, request }) => {
        const unknown = [...new URL(request.url).searchParams.keys()].find(
          (key) => !suggestQueryKeys.has(key),
        );
        if (unknown !== undefined)
          throw new InvalidListingSearchQueryError(unknown);
        return successResponse(
          await searchService.suggest(query),
          "Suggestions retrieved",
        );
      },
      {
        query: "listing.suggest.query",
        response: {
          200: "listing.suggest",
          400: "listing.suggest.bad_request",
          500: "listing.suggest.internal_error",
        },
        detail: suggestListingsRouteDetail,
      },
    )
    .get(
      "",
      async ({ query, request }) => {
        const unknown = [...new URL(request.url).searchParams.keys()].find(
          (key) => !searchQueryKeys.has(key),
        );
        if (unknown !== undefined)
          throw new InvalidListingSearchQueryError(unknown);
        const page = await searchService.search({
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
    );
}

export const listingSearchController = createListingSearchController();
