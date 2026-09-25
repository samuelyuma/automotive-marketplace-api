import type {
  Listing,
  NewListing,
  SoftDeletedListing,
  UpdateListing,
} from "../../domain/entities/listing";
import { ListingNotFoundError } from "../../domain/errors/listing-error";
import type { CachePort } from "../ports/cache.port";
import type { ListingRepository } from "../ports/listing-repository.port";
import { bestEffort } from "../utils/best-effort";

type CachedListing = Omit<Listing, "created_at" | "updated_at"> & {
  created_at: string;
  updated_at: string;
};

// Point reads use entity keys; collection reads use revisioned HTTP caching.
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
    const cache = this.cache;
    const cached = cache
      ? await bestEffort(() => cache.get<CachedListing>(cacheKey(id)))
      : null;
    if (cached)
      return {
        ...cached,
        created_at: new Date(cached.created_at),
        updated_at: new Date(cached.updated_at),
      };

    const listing = await this.repository.getById(id);
    if (!listing) throw new ListingNotFoundError();
    if (cache) await bestEffort(() => cache.set(cacheKey(id), listing, 60));
    return listing;
  }

  create(data: NewListing): Promise<Listing> {
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateListing): Promise<Listing> {
    const listing = await this.repository.update(id, data);
    const cache = this.cache;
    if (cache) await bestEffort(() => cache.del(cacheKey(id)));
    if (!listing) throw new ListingNotFoundError();
    return listing;
  }

  async softDelete(id: string): Promise<SoftDeletedListing> {
    const listing = await this.repository.softDelete(id);
    const cache = this.cache;
    if (cache) await bestEffort(() => cache.del(cacheKey(id)));
    if (!listing) throw new ListingNotFoundError();
    return listing;
  }
}
