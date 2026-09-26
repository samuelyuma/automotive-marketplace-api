import postgres from "postgres";

import type { ListingRepository } from "../../application/ports/listing-repository.port";
import type {
  Listing,
  ListingAttributeValue,
  NewListing,
  SoftDeletedListing,
  UpdateListing,
  ValidatedListingAttribute,
} from "../../domain/entities/listing";
import {
  ListingAttributeCategoryMismatchError,
  ListingCategoryNotFoundError,
} from "../../domain/errors/listing-error";
import { sql } from "../../infrastructure/postgres/client";
import { timedQuery } from "../../infrastructure/postgres/timed-query";
import { CONSTRAINTS } from "./constraint-names";
import { listingColumns } from "./listing-row";

type ListingRow = Omit<Listing, "price"> & { price: string };

function toListing(row: ListingRow): Listing {
  return { ...row, price: Number(row.price) };
}

// Detail reads show values only for active definitions in the listing's category.
async function getListingAttributes(
  id: string,
): Promise<ListingAttributeValue[]> {
  const rows = await sql<
    {
      key: string;
      label: string;
      value_text: string | null;
      value_number: string | null;
      value_bool: boolean | null;
    }[]
  >`
    SELECT d.key, d.label, v.value_text, v.value_number::text, v.value_bool
    FROM listing_attribute_values v
    JOIN attribute_definitions d ON d.id = v.attribute_definition_id
    JOIN vehicle_listings l ON l.id = v.listing_id
    -- Hide values for removed definitions or a previous listing category.
    WHERE v.listing_id = ${id} AND d.deleted_at IS NULL AND d.category_id = l.category_id
    ORDER BY d.key
  `;
  // PostgreSQL numeric values arrive as text, so convert them for the API.
  return rows.map((row) => {
    const value =
      row.value_text ??
      (row.value_number === null ? row.value_bool : Number(row.value_number));
    if (value === null) throw new Error("Listing attribute has no value");
    return { key: row.key, label: row.label, value };
  });
}

// Convert the category foreign key failure into the listing API error.
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
          SELECT ${listingColumns}
          FROM vehicle_listings
          WHERE id = ${id} AND status <> 'REMOVED'
        `;
      return listing
        ? { ...toListing(listing), attributes: await getListingAttributes(id) }
        : null;
    });
  }

  async create(
    data: NewListing,
    attributes?: ValidatedListingAttribute[],
  ): Promise<Listing> {
    return timedQuery("listing.create", "light", async () => {
      try {
        // The listing and its values either commit together or both roll back.
        const listing = await sql.begin(async (tx) => {
          const [row] = await tx<ListingRow[]>`
        INSERT INTO vehicle_listings (
          category_id, make, model, year, price, mileage, condition,
          color, location, image_url, fuel_type, transmission, engine_cc
        ) VALUES (
          ${data.category_id}, ${data.make}, ${data.model}, ${data.year},
          ${data.price}, ${data.mileage}, ${data.condition}, ${data.color},
          ${data.location}, ${data.image_url ?? null}, ${data.fuel_type ?? null},
          ${data.transmission ?? null}, ${data.engine_cc ?? null}
        )
        RETURNING ${listingColumns}
          `;
          if (!row) throw new Error("Listing insert returned no row");
          for (const attribute of attributes ?? []) {
            await tx`
              INSERT INTO listing_attribute_values
                (listing_id, attribute_definition_id, value_text, value_number, value_bool)
              VALUES (${row.id}, ${attribute.attribute_definition_id}, ${attribute.text},
                      ${attribute.number}, ${attribute.bool})
            `;
          }
          return row;
        });
        return toListing(listing);
      } catch (error) {
        throwListingError(error);
      }
    });
  }

  async update(
    id: string,
    data: UpdateListing,
    attributes?: ValidatedListingAttribute[],
    attributeCategoryId?: string,
  ): Promise<Listing | null> {
    return timedQuery("listing.update", "light", async () => {
      try {
        const listing = await sql.begin(async (tx) => {
          // Lock the listing before checking its category and replacing values.
          const [previous] = await tx<{ category_id: string }[]>`
            SELECT category_id FROM vehicle_listings
            WHERE id = ${id} AND status <> 'REMOVED' FOR UPDATE
          `;
          if (!previous) return null;
          const [row] = await tx<ListingRow[]>`
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
            -- Nullable fields distinguish an omitted input from an explicit null.
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
          if (!row) return null;
          // A concurrent category change makes the earlier validation stale.
          if (
            attributes !== undefined &&
            row.category_id !== attributeCategoryId
          )
            throw new ListingAttributeCategoryMismatchError();
          const categoryChanged = previous.category_id !== row.category_id;
          // Omitted attributes keep their values; a supplied array replaces them.
          if (categoryChanged || attributes !== undefined) {
            if (categoryChanged || attributes?.length === 0) {
              await tx`DELETE FROM listing_attribute_values WHERE listing_id = ${id}`;
            } else if (attributes) {
              const ids = attributes.map(
                (attribute) => attribute.attribute_definition_id,
              );
              await tx`
                DELETE FROM listing_attribute_values
                WHERE listing_id = ${id}
                  -- Remove definitions omitted from the supplied set.
                  AND attribute_definition_id NOT IN ${tx(ids)}
              `;
            }
            for (const attribute of attributes ?? []) {
              await tx`
                INSERT INTO listing_attribute_values
                  (listing_id, attribute_definition_id, value_text, value_number, value_bool)
                VALUES (${id}, ${attribute.attribute_definition_id}, ${attribute.text},
                        ${attribute.number}, ${attribute.bool})
                -- Existing values keep their row ID and receive the new typed value.
                ON CONFLICT (listing_id, attribute_definition_id)
                DO UPDATE SET value_text = EXCLUDED.value_text,
                              value_number = EXCLUDED.value_number,
                              value_bool = EXCLUDED.value_bool,
                              updated_at = now()
              `;
            }
          }
          return row;
        });
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
