import { DomainError } from "./domain-error";

export class CategorySlugConflictError extends DomainError {
  readonly kind = "conflict" as const;
  readonly code = "CATEGORY_SLUG_CONFLICT";
  constructor() {
    super("Category slug already exists");
    this.name = "CategorySlugConflictError";
  }
}

export class CategoryParentNotFoundError extends DomainError {
  readonly kind = "invalid" as const;
  readonly code = "CATEGORY_PARENT_NOT_FOUND";
  constructor() {
    super("Parent category does not exist");
    this.name = "CategoryParentNotFoundError";
  }
}
