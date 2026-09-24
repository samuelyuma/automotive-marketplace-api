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

export class CategoryNotFoundError extends DomainError {
  readonly kind = "not_found" as const;
  readonly code = "CATEGORY_NOT_FOUND";
  constructor() {
    super("Category does not exist");
    this.name = "CategoryNotFoundError";
  }
}

export class CategoryInvalidParentError extends DomainError {
  readonly kind = "invalid" as const;
  readonly code = "CATEGORY_INVALID_PARENT";
  constructor() {
    super("Category cannot be its own parent");
    this.name = "CategoryInvalidParentError";
  }
}

export class CategoryAttributeKeyConflictError extends DomainError {
  readonly kind = "conflict" as const;
  readonly code = "CATEGORY_ATTRIBUTE_KEY_CONFLICT";
  constructor() {
    super("Category attribute key already exists");
    this.name = "CategoryAttributeKeyConflictError";
  }
}
