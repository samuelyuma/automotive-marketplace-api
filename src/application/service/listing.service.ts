import type {
  Listing,
  NewListing,
  SoftDeletedListing,
  UpdateListing,
} from "@domain/entities/listing";
import { ListingNotFoundError } from "@domain/errors/listing-error";

import type {
  ListingDirection,
  ListingFilters,
  ListingRepository,
  ListingSort,
} from "../ports/listing-repository.port";
import {
  decodeListingCursor,
  encodeListingCursor,
} from "../utils/listing-cursor";
import {
  normalizeListingSearchTerm,
  validateListingSearchRanges,
} from "../utils/listing-search";

export class ListingService {
  constructor(private readonly repository: ListingRepository) {}

  async list(
    query: ListingFilters & {
      q?: string;
      include_facets?: boolean;
      sort: ListingSort;
      direction: ListingDirection;
      per_page: number;
      cursor?: string;
    },
  ) {
    const { cursor: encodedCursor, ...filters } = query;
    const cursor = decodeListingCursor(
      encodedCursor,
      query.sort,
      query.direction,
    );
    const result = await this.repository.list({ ...filters, cursor });
    const hasMore = result.rows.length > query.per_page;
    const page = result.rows.slice(0, query.per_page);
    const last = page.at(-1);

    return {
      data: page.map((row) => row.listing),
      meta: {
        per_page: query.per_page,
        next_cursor:
          hasMore && last
            ? encodeListingCursor(query.sort, query.direction, {
                id: last.listing.id,
                value: last.cursor_value,
              })
            : null,
      },
      facets: result.facets,
    };
  }

  search(
    query: ListingFilters & {
      q?: string;
      sort?: ListingSort;
      direction?: ListingDirection;
      per_page?: number;
      cursor?: string;
    },
  ) {
    validateListingSearchRanges(query);
    const q = normalizeListingSearchTerm(query.q);
    const sort =
      query.sort === "relevance" && !q
        ? "created_at"
        : (query.sort ?? (q ? "relevance" : "created_at"));
    return this.list({
      ...query,
      q,
      sort,
      direction: query.direction ?? "desc",
      per_page: query.per_page ?? 20,
      include_facets: false,
    });
  }

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
