import type { Listing } from "../../domain/entities/listing";
import { sql } from "../../infrastructure/postgres/client";

export type ListingRow = Omit<Listing, "price"> & { price: string };

// PostgreSQL returns bigint prices as text.
export function toListing(row: ListingRow): Listing {
  return { ...row, price: Number(row.price) };
}

// Use the same listing fields in detail and search queries.
export const listingColumns = sql`
  id, category_id, make, model, year, price, mileage, condition, color,
  location, status, image_url, fuel_type, transmission, engine_cc,
  created_at, updated_at
`;
