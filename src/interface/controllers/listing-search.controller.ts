import Elysia from "elysia";

import type { Container } from "../../main/container";
import { cachedRead } from "../http/read-cache";
import { paginatedResponse, successResponse } from "../http/response";
import { assertNoUnknownQueryParams } from "../http/strict-query";
import { toListingDetail } from "../presenters/listing.presenter";
import {
  SearchListingsModel,
  searchListingsRouteDetail,
} from "../validators/listing-search.validator";
import {
  SuggestListingsModel,
  suggestListingsRouteDetail,
} from "../validators/listing-suggest.validator";
import { RateLimitModel } from "../validators/response.validator";

const searchQueryKeys = new Set([
  "q",
  "category_id",
  "make",
  "model",
  "condition",
  "fuel_type",
  "transmission",
  "min_price",
  "max_price",
  "min_year",
  "max_year",
  "min_mileage",
  "max_mileage",
  "location",
  "sort",
  "direction",
  "per_page",
  "cursor",
]);
const suggestQueryKeys = new Set(["q", "type", "limit"]);

export function createListingSearchController({
  cache,
  listingSearchService,
}: Container) {
  return new Elysia({ prefix: "/listings/search" })
    .use(SearchListingsModel)
    .use(SuggestListingsModel)
    .use(RateLimitModel)
    .get(
      "/suggest",
      async ({ query, request }) => {
        assertNoUnknownQueryParams(request, suggestQueryKeys);

        return cachedRead(
          cache,
          request,
          async () =>
            successResponse(
              await listingSearchService.suggest(query),
              "Suggestions retrieved",
            ),
          { resource: "listings", ttlSeconds: 60 },
        );
      },
      {
        query: "listing.suggest.query",
        response: {
          200: "listing.suggest",
          400: "listing.suggest.bad_request",
          429: "rate.limited",
          500: "listing.suggest.internal_error",
        },
        detail: suggestListingsRouteDetail,
      },
    )
    .get(
      "",
      async ({ query, request }) => {
        assertNoUnknownQueryParams(request, searchQueryKeys);

        return cachedRead(
          cache,
          request,
          async () => {
            const page = await listingSearchService.search({
              q: query.q,
              category_id: query.category_id,
              make: query.make,
              model: query.model,
              condition: query.condition,
              fuel_type: query.fuel_type,
              transmission: query.transmission,
              min_price: query.min_price,
              max_price: query.max_price,
              min_year: query.min_year,
              max_year: query.max_year,
              min_mileage: query.min_mileage,
              max_mileage: query.max_mileage,
              location: query.location,
              sort: query.sort,
              direction: query.direction,
              per_page: query.per_page,
              cursor: query.cursor,
            });

            return paginatedResponse(
              page.data.map(toListingDetail),
              "Listings found",
              page.meta,
            );
          },
          { resource: "listings", ttlSeconds: 60 },
        );
      },
      {
        query: "listing.search.query",
        response: {
          200: "listing.search",
          400: "listing.search.bad_request",
          429: "rate.limited",
          500: "listing.search.internal_error",
        },
        detail: searchListingsRouteDetail,
      },
    );
}
