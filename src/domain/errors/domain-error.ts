export type ErrorKind = "not_found" | "conflict" | "invalid" | "bad_request";

export abstract class DomainError extends Error {
  abstract readonly kind: ErrorKind;
  abstract readonly code: string;
  readonly details?: { field: string; issue: string }[];
}
