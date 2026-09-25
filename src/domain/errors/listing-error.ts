import { DomainError } from "./domain-error";

export class ListingCategoryNotFoundError extends DomainError {
  readonly kind = "invalid" as const;
  readonly code = "LISTING_CATEGORY_NOT_FOUND";

  constructor() {
    super("Category does not exist");
    this.name = "ListingCategoryNotFoundError";
  }
}

export class ListingNotFoundError extends DomainError {
  readonly kind = "not_found" as const;
  readonly code = "LISTING_NOT_FOUND";

  constructor() {
    super("Listing does not exist");
    this.name = "ListingNotFoundError";
  }
}

export class InvalidListingCursorError extends DomainError {
  readonly kind = "bad_request" as const;
  readonly code = "VALIDATION_ERROR";
  override readonly details = [
    { field: "cursor", issue: "Invalid listing cursor" },
  ];

  constructor() {
    super("Request validation failed");
    this.name = "InvalidListingCursorError";
  }
}

export class InvalidListingSuggestionError extends DomainError {
  readonly kind = "bad_request" as const;
  readonly code = "VALIDATION_ERROR";
  override readonly details = [
    { field: "q", issue: "Must contain at least two characters" },
  ];

  constructor() {
    super("Request validation failed");
    this.name = "InvalidListingSuggestionError";
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
