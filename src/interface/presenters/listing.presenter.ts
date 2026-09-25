import type { Listing } from "../../domain/entities/listing";

function toBaseDTO({
  created_at: _createdAt,
  updated_at: _updatedAt,
  ...fields
}: Listing) {
  return fields;
}

export function toListingDetail(listing: Listing) {
  return {
    ...toBaseDTO(listing),
    created_at: listing.created_at.toISOString(),
    updated_at: listing.updated_at.toISOString(),
  };
}

export function toCreatedListing(listing: Listing) {
  return {
    ...toBaseDTO(listing),
    created_at: listing.created_at.toISOString(),
  };
}

export function toUpdatedListing(listing: Listing) {
  return {
    ...toBaseDTO(listing),
    updated_at: listing.updated_at.toISOString(),
  };
}
