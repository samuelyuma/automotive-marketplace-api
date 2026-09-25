import { DomainError } from "@domain/errors/domain-error";

import type {
  ListingCursor,
  ListingDirection,
  ListingSort,
} from "../ports/listing-repository.port";

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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function encodeListingCursor(
  sort: ListingSort,
  direction: ListingDirection,
  cursor: ListingCursor,
): string {
  return Buffer.from(
    JSON.stringify({ version: 1, sort, direction, ...cursor }),
  ).toString("base64url");
}

export function decodeListingCursor(
  encoded: string | undefined,
  sort: ListingSort,
  direction: ListingDirection,
): ListingCursor | null {
  if (encoded === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    );
    if (typeof parsed !== "object" || parsed === null) throw new Error();
    const value = parsed as Record<string, unknown>;
    if (
      value.version !== 1 ||
      value.sort !== sort ||
      value.direction !== direction ||
      typeof value.id !== "string" ||
      !uuidPattern.test(value.id) ||
      typeof value.value !== "string"
    )
      throw new Error();

    if (sort === "created_at") {
      if (!Number.isFinite(Date.parse(value.value))) throw new Error();
    } else if (sort === "relevance") {
      const rank = Number(value.value);
      if (
        value.value.length > 64 ||
        !/^(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value.value) ||
        !Number.isFinite(rank) ||
        rank < 0 ||
        rank > 1e6
      )
        throw new Error();
    } else {
      const numeric = Number(value.value);
      const minimum = sort === "year" ? 1900 : 0;
      const maximum =
        sort === "year"
          ? 2100
          : sort === "mileage"
            ? 2147483647
            : Number.MAX_SAFE_INTEGER;
      if (
        !/^\d+$/.test(value.value) ||
        !Number.isSafeInteger(numeric) ||
        numeric < minimum ||
        numeric > maximum
      )
        throw new Error();
    }
    return { id: value.id, value: value.value };
  } catch {
    throw new InvalidListingCursorError();
  }
}
