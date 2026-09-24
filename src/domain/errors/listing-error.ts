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
