import { DomainError } from "@domain/errors/domain-error";

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
