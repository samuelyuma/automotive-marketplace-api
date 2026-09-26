import type {
  Listing,
  NewListing,
  SoftDeletedListing,
  UpdateListing,
  ValidatedListingAttribute,
} from "../../domain/entities/listing";
import {
  ListingAttributeCategoryMismatchError,
  ListingCategoryNotFoundError,
  ListingNotFoundError,
} from "../../domain/errors/listing-error";
import { validateListingAttributes } from "../../domain/policies/listing-attribute-validation";
import type { CachePort } from "../ports/cache.port";
import type { CategoryRepository } from "../ports/category-repository.port";
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
    private readonly categories: Pick<
      CategoryRepository,
      "getWithChildren" | "getAttributeById"
    >,
    private readonly cache?: CachePort,
  ) {}

  // Check ownership first so a foreign definition gets a clearer error.
  private async validateAttributes(
    categoryId: string,
    submitted: NonNullable<NewListing["attributes"]>,
  ): Promise<ValidatedListingAttribute[]> {
    const detail = await this.categories.getWithChildren(categoryId);
    if (!detail) throw new ListingCategoryNotFoundError();
    const ownIds = new Set(
      detail.category.attributes.map((attribute) => attribute.id),
    );
    for (const item of submitted) {
      if (!ownIds.has(item.attribute_definition_id)) {
        const other = await this.categories.getAttributeById(
          item.attribute_definition_id,
        );
        if (other && other.category_id !== categoryId)
          throw new ListingAttributeCategoryMismatchError();
      }
    }
    return validateListingAttributes(detail.category.attributes, submitted);
  }

  async getById(id: string): Promise<Listing> {
    const cache = this.cache;
    const cached = cache
      ? await bestEffort(() => cache.get<CachedListing>(cacheKey(id)))
      : null;
    // Cache storage turns dates into strings.
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

  async create(data: NewListing): Promise<Listing> {
    const attributes =
      data.attributes === undefined
        ? undefined
        : await this.validateAttributes(data.category_id, data.attributes);
    return this.repository.create(data, attributes);
  }

  async update(id: string, data: UpdateListing): Promise<Listing> {
    let attributes: ValidatedListingAttribute[] | undefined;
    let attributeCategoryId: string | undefined;
    if (data.attributes !== undefined) {
      // Use the current category when the request changes values but not category.
      const existing = data.category_id
        ? null
        : await this.repository.getById(id);
      const categoryId = data.category_id ?? existing?.category_id;
      if (!categoryId) throw new ListingNotFoundError();
      attributeCategoryId = categoryId;
      attributes = await this.validateAttributes(categoryId, data.attributes);
    }
    const listing = await this.repository.update(
      id,
      data,
      attributes,
      attributeCategoryId,
    );
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
