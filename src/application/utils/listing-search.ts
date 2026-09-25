import { DomainError } from "../../domain/errors/domain-error";
import type { ListingFilters } from "../ports/listing-search-repository.port";

export class InvalidListingSearchRangeError extends DomainError {
  readonly kind = "bad_request" as const;
  readonly code = "VALIDATION_ERROR";
  override readonly details: { field: string; issue: string }[];

  constructor(field: string, lowerField: string) {
    super("Request validation failed");
    this.name = "InvalidListingSearchRangeError";
    this.details = [
      { field, issue: `Must be greater than or equal to ${lowerField}` },
    ];
  }
}

export class InvalidListingSearchQueryError extends DomainError {
  readonly kind = "bad_request" as const;
  readonly code = "VALIDATION_ERROR";
  override readonly details: { field: string; issue: string }[];

  constructor(field: string, issue = "Unknown query parameter") {
    super("Request validation failed");
    this.name = "InvalidListingSearchQueryError";
    this.details = [{ field, issue }];
  }
}

export function normalizeListingSearchTerm(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed && /[\p{L}\p{N}]/u.test(trimmed) ? trimmed : undefined;
}

export function validateListingSearchRanges(filters: ListingFilters): void {
  for (const [min, max] of [
    ["min_price", "max_price"],
    ["min_year", "max_year"],
    ["min_mileage", "max_mileage"],
  ] as const) {
    const lower = filters[min];
    const upper = filters[max];
    if (lower !== undefined && upper !== undefined && lower > upper)
      throw new InvalidListingSearchRangeError(max, min);
  }
}
