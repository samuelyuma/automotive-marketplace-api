import type {
  Listing,
  NewListing,
  UpdateListing,
} from "@domain/entities/listing";

export interface ListingRepository {
  create(data: NewListing): Promise<Listing>;
  update(id: string, data: UpdateListing): Promise<Listing | null>;
}
