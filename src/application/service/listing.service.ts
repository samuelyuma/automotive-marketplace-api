import type {
  Listing,
  NewListing,
  SoftDeletedListing,
  UpdateListing,
} from "../../domain/entities/listing";
import { ListingNotFoundError } from "../../domain/errors/listing-error";
import type { ListingRepository } from "../ports/listing-repository.port";

export class ListingService {
  constructor(
    private readonly repository: Pick<
      ListingRepository,
      "getById" | "create" | "update" | "softDelete"
    >,
  ) {}

  async getById(id: string): Promise<Listing> {
    const listing = await this.repository.getById(id);
    if (!listing) throw new ListingNotFoundError();
    return listing;
  }

  create(data: NewListing): Promise<Listing> {
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateListing): Promise<Listing> {
    const listing = await this.repository.update(id, data);
    if (!listing) throw new ListingNotFoundError();
    return listing;
  }

  async softDelete(id: string): Promise<SoftDeletedListing> {
    const listing = await this.repository.softDelete(id);
    if (!listing) throw new ListingNotFoundError();
    return listing;
  }
}
