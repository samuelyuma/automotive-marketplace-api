import type { Listing, NewListing } from "@domain/entities/listing";

export interface ListingRepository {
  create(data: NewListing): Promise<Listing>;
}
