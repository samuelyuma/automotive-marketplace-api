import Elysia from "elysia";

import type { ListingRepository } from "@application/ports/listing-repository.port";
import { ListingService } from "@application/service/listing.service";

import type { Listing } from "@domain/entities/listing";

import { successResponse } from "@interface/http/response";
import {
  CreateListingModel,
  createListingRouteDetail,
} from "@interface/validators/listing/create-listing.validator";

import { PgListingRepository } from "@repository/postgres/listing.repository";

function serializeCreatedListing(listing: Listing) {
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
    created_at: listing.created_at.toISOString(),
  };
}

export function createListingController(
  repository: ListingRepository = new PgListingRepository(),
) {
  const listingService = new ListingService(repository);

  return new Elysia({ prefix: "/listings" }).use(CreateListingModel).post(
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
  );
}

export const listingController = createListingController();
