import Elysia from "elysia";

import { InvalidListingSearchQueryError } from "../../domain/errors/listing-error";
import type { Container } from "../../main/container";
import { cachedRead } from "../http/read-cache";
import { paginatedResponse, successResponse } from "../http/response";
import { toListingDetail } from "../presenters/listing.presenter";
import {
  SearchListingsModel,
  searchListingsRouteDetail,
} from "../validators/listing-search.validator";
import {
  SuggestListingsModel,
  suggestListingsRouteDetail,
} from "../validators/listing-suggest.validator";

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

export function createListingSearchController({
  cache,
  listingSearchService,
}: Container) {
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
          500: "listing.search.internal_error",
        },
        detail: searchListingsRouteDetail,
      },
    );
}
