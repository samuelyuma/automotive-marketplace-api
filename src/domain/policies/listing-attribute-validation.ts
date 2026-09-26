import type { CategoryAttribute } from "../entities/category";
import type {
  SubmittedAttribute,
  ValidatedListingAttribute,
} from "../entities/listing";
import {
  InvalidListingAttributeError,
  ListingAttributeNotFoundError,
} from "../errors/listing-error";

// Match submitted values to active definitions and the right database column.
export function validateListingAttributes(
  definitions: CategoryAttribute[],
  submitted: SubmittedAttribute[],
): ValidatedListingAttribute[] {
  const byId = new Map(
    definitions
      .filter((item) => item.deleted_at === null)
      .map((item) => [item.id, item]),
  );
  const seen = new Set<string>();
  return submitted.map(({ attribute_definition_id: id, value }, index) => {
    const field = `attributes/${index}/value`;
    if (seen.has(id))
      throw new InvalidListingAttributeError(
        `attributes/${index}/attribute_definition_id`,
        "Duplicate attribute definition",
      );
    seen.add(id);
    const definition = byId.get(id);
    if (!definition) throw new ListingAttributeNotFoundError();
    if (definition.type === "ENUM") {
      if (typeof value !== "string" || !definition.options?.includes(value))
        throw new InvalidListingAttributeError(
          field,
          "Must be one of the defined options",
        );
      return {
        attribute_definition_id: id,
        text: value,
        number: null,
        bool: null,
      };
    }
    if (definition.type === "RANGE") {
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new InvalidListingAttributeError(
          field,
          "Must be a finite number",
        );
      return {
        attribute_definition_id: id,
        text: null,
        number: value,
        bool: null,
      };
    }
    if (typeof value !== "boolean")
      throw new InvalidListingAttributeError(field, "Must be a boolean");
    return {
      attribute_definition_id: id,
      text: null,
      number: null,
      bool: value,
    };
  });
}
