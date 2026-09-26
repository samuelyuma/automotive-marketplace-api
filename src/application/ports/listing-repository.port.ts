import type {
  Listing,
  NewListing,
  SoftDeletedListing,
  UpdateListing,
  ValidatedListingAttribute,
} from "../../domain/entities/listing";

export interface ListingRepository {
  getById(id: string): Promise<Listing | null>;
  create(
    data: NewListing,
    attributes?: ValidatedListingAttribute[],
  ): Promise<Listing>;
  update(
    id: string,
    data: UpdateListing,
    attributes?: ValidatedListingAttribute[],
    // The category checked by the service must still match when the row is locked.
    attributeCategoryId?: string,
  ): Promise<Listing | null>;
  softDelete(id: string): Promise<SoftDeletedListing | null>;
}
