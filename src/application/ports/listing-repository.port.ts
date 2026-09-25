import type {
  Listing,
  NewListing,
  SoftDeletedListing,
  UpdateListing,
} from "@domain/entities/listing";

export interface ListingRepository {
  list(query: ListingSearchQuery): Promise<ListingSearchResult>;
  suggest(query: ListingSuggestionQuery): Promise<ListingSuggestion[]>;
  getById(id: string): Promise<Listing | null>;
  create(data: NewListing): Promise<Listing>;
  update(id: string, data: UpdateListing): Promise<Listing | null>;
  softDelete(id: string): Promise<SoftDeletedListing | null>;
}

export type ListingSort =
  | "created_at"
  | "price"
  | "mileage"
  | "year"
  | "relevance";
export type ListingDirection = "asc" | "desc";

export type ListingSuggestionType = "make" | "model" | "location";
export type ListingSuggestion = { type: ListingSuggestionType; value: string };
export type ListingSuggestionQuery = {
  q: string;
  type?: ListingSuggestionType;
  limit: number;
};

export type ListingFilters = {
  category_id?: string;
  scope_category_id?: string;
  make?: string;
  model?: string;
  condition?: Listing["condition"];
  fuel_type?: NonNullable<Listing["fuel_type"]>;
  transmission?: NonNullable<Listing["transmission"]>;
  min_year?: number;
  max_year?: number;
  min_price?: number;
  max_price?: number;
  min_mileage?: number;
  max_mileage?: number;
  location?: string;
};

export type ListingCursor = { id: string; value: string };

export type ListingSearchQuery = ListingFilters & {
  q?: string;
  include_facets?: boolean;
  sort: ListingSort;
  direction: ListingDirection;
  per_page: number;
  cursor: ListingCursor | null;
};

export type ListingSearchResult = {
  rows: { listing: Listing; cursor_value: string }[];
  facets: { make: { value: string; count: number }[] };
};
