import type { Listing, NewListing } from "@domain/entities/listing";

import type { ListingRepository } from "../ports/listing-repository.port";

export class ListingService {
  constructor(private readonly repository: ListingRepository) {}

  create(data: NewListing): Promise<Listing> {
    return this.repository.create(data);
  }
}
