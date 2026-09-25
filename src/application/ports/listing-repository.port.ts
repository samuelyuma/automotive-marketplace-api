import type {
  Listing,
  NewListing,
  SoftDeletedListing,
  UpdateListing,
} from "@domain/entities/listing";

export interface ListingRepository {
  getById(id: string): Promise<Listing | null>;
  create(data: NewListing): Promise<Listing>;
  update(id: string, data: UpdateListing): Promise<Listing | null>;
  softDelete(id: string): Promise<SoftDeletedListing | null>;
}
