import postgres from "postgres";

import type { ListingRepository } from "@application/ports/listing-repository.port";

import type { Listing, NewListing } from "@domain/entities/listing";
import { ListingCategoryNotFoundError } from "@domain/errors/listing-error";

import { sql } from "@infrastructure/postgres/client";

export class PgListingRepository implements ListingRepository {
  async create(data: NewListing): Promise<Listing> {
    try {
      const [listing] = await sql<
        (Omit<Listing, "price"> & { price: string })[]
      >`
        INSERT INTO vehicle_listings (
          category_id, make, model, year, price, mileage, condition,
          color, location, image_url, fuel_type, transmission, engine_cc
        ) VALUES (
          ${data.category_id}, ${data.make}, ${data.model}, ${data.year},
          ${data.price}, ${data.mileage}, ${data.condition}, ${data.color},
          ${data.location}, ${data.image_url ?? null}, ${data.fuel_type ?? null},
          ${data.transmission ?? null}, ${data.engine_cc ?? null}
        )
        RETURNING id, category_id, make, model, year, price, mileage,
                  condition, color, location, status, image_url, fuel_type,
                  transmission, engine_cc, created_at, updated_at
      `;
      if (!listing) throw new Error("Listing insert returned no row");
      return { ...listing, price: Number(listing.price) };
    } catch (error) {
      if (
        error instanceof postgres.PostgresError &&
        error.code === "23503" &&
        error.constraint_name === "vehicle_listings_category_id_fkey"
      )
        throw new ListingCategoryNotFoundError();
      throw error;
    }
  }
}
