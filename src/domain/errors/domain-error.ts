export type ErrorKind = "not_found" | "conflict" | "invalid";

export abstract class DomainError extends Error {
  abstract readonly kind: ErrorKind;
  abstract readonly code: string;
}
