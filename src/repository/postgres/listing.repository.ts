import postgres from "postgres";

import type { ListingRepository } from "../../application/ports/listing-repository.port";
import type {
  Listing,
  NewListing,
  SoftDeletedListing,
  UpdateListing,
} from "../../domain/entities/listing";
import { ListingCategoryNotFoundError } from "../../domain/errors/listing-error";
import { sql } from "../../infrastructure/postgres/client";
import { timedQuery } from "../../infrastructure/postgres/timed-query";
import { CONSTRAINTS } from "./constraint-names";

type ListingRow = Omit<Listing, "price"> & { price: string };

function toListing(row: ListingRow): Listing {
  return { ...row, price: Number(row.price) };
}

function throwListingError(error: unknown): never {
  if (
    error instanceof postgres.PostgresError &&
    error.code === "23503" &&
    error.constraint_name === CONSTRAINTS.listingCategoryFk
  )
    throw new ListingCategoryNotFoundError();
  throw error;
}

export class PgListingRepository implements ListingRepository {
  async getById(id: string): Promise<Listing | null> {
    return timedQuery("listing.getById", "light", async () => {
      const [listing] = await sql<ListingRow[]>`
      SELECT id, category_id, make, model, year, price, mileage,
             condition, color, location, status, image_url, fuel_type,
             transmission, engine_cc, created_at, updated_at
      FROM vehicle_listings
      WHERE id = ${id} AND status <> 'REMOVED'
    `;
      return listing ? toListing(listing) : null;
    });
  }

  async create(data: NewListing): Promise<Listing> {
    return timedQuery("listing.create", "light", async () => {
      try {
        const [listing] = await sql<ListingRow[]>`
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
        return toListing(listing);
      } catch (error) {
        throwListingError(error);
      }
    });
  }

  async update(id: string, data: UpdateListing): Promise<Listing | null> {
    return timedQuery("listing.update", "light", async () => {
      try {
        const [listing] = await sql<ListingRow[]>`
        UPDATE vehicle_listings
        SET category_id = COALESCE(${data.category_id ?? null}::uuid, category_id),
            make = COALESCE(${data.make ?? null}, make),
            model = COALESCE(${data.model ?? null}, model),
            year = COALESCE(${data.year ?? null}::smallint, year),
            price = COALESCE(${data.price ?? null}::bigint, price),
            mileage = COALESCE(${data.mileage ?? null}::integer, mileage),
            condition = COALESCE(${data.condition ?? null}::listing_conditions, condition),
            color = COALESCE(${data.color ?? null}, color),
            location = COALESCE(${data.location ?? null}, location),
            status = COALESCE(${data.status ?? null}::listing_statuses, status),
            image_url = CASE WHEN ${data.image_url !== undefined} THEN ${data.image_url ?? null} ELSE image_url END,
            fuel_type = CASE WHEN ${data.fuel_type !== undefined} THEN ${data.fuel_type ?? null}::fuel_types ELSE fuel_type END,
            transmission = CASE WHEN ${data.transmission !== undefined} THEN ${data.transmission ?? null}::transmissions ELSE transmission END,
            engine_cc = CASE WHEN ${data.engine_cc !== undefined} THEN ${data.engine_cc ?? null}::integer ELSE engine_cc END,
            updated_at = now()
        WHERE id = ${id} AND status <> 'REMOVED'
        RETURNING id, category_id, make, model, year, price, mileage,
                  condition, color, location, status, image_url, fuel_type,
                  transmission, engine_cc, created_at, updated_at
      `;
        return listing ? toListing(listing) : null;
      } catch (error) {
        throwListingError(error);
      }
    });
  }

  async softDelete(id: string): Promise<SoftDeletedListing | null> {
    return timedQuery("listing.softDelete", "light", async () => {
      const [listing] = await sql<SoftDeletedListing[]>`
      UPDATE vehicle_listings
      SET status = 'REMOVED', updated_at = now()
      WHERE id = ${id} AND status <> 'REMOVED'
      RETURNING id, status, updated_at
    `;
      return listing ?? null;
    });
  }
}
