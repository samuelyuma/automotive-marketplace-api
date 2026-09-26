import type { Listing } from "../../domain/entities/listing";
import { sql } from "../../infrastructure/postgres/client";

export type ListingRow = Omit<Listing, "price"> & { price: string };

export function toListing(row: ListingRow): Listing {
  return { ...row, price: Number(row.price) };
}

export const listingColumns = sql`
  id, category_id, make, model, year, price, mileage, condition, color,
  location, status, image_url, fuel_type, transmission, engine_cc,
  created_at, updated_at
`;
