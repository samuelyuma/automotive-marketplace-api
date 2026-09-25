import type {
  Listing,
  NewListing,
  SoftDeletedListing,
  UpdateListing,
} from "../../domain/entities/listing";
import { ListingNotFoundError } from "../../domain/errors/listing-error";
import type { CachePort } from "../ports/cache.port";
import type { ListingRepository } from "../ports/listing-repository.port";

type CachedListing = Omit<Listing, "created_at" | "updated_at"> & {
  created_at: string;
  updated_at: string;
};

const cacheKey = (id: string) => `listing:${id}`;

export class ListingService {
  constructor(
    private readonly repository: Pick<
      ListingRepository,
      "getById" | "create" | "update" | "softDelete"
    >,
    private readonly cache?: CachePort,
  ) {}

  async getById(id: string): Promise<Listing> {
    try {
      const cached = await this.cache?.get<CachedListing>(cacheKey(id));
      if (cached)
        return {
          ...cached,
          created_at: new Date(cached.created_at),
          updated_at: new Date(cached.updated_at),
        };
    } catch {
      // Cache failures leave PostgreSQL as the source of truth.
    }

    const listing = await this.repository.getById(id);
    if (!listing) throw new ListingNotFoundError();
    try {
      await this.cache?.set(cacheKey(id), listing, 60);
    } catch {
      // A failed cache write must not fail the lookup.
    }
    return listing;
  }

  create(data: NewListing): Promise<Listing> {
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateListing): Promise<Listing> {
    const listing = await this.repository.update(id, data);
    try {
      await this.cache?.del(cacheKey(id));
    } catch {
      // The database write has already succeeded.
    }
    if (!listing) throw new ListingNotFoundError();
    return listing;
  }

  async softDelete(id: string): Promise<SoftDeletedListing> {
    const listing = await this.repository.softDelete(id);
    try {
      await this.cache?.del(cacheKey(id));
    } catch {
      // The database write has already succeeded.
    }
    if (!listing) throw new ListingNotFoundError();
    return listing;
  }
}
