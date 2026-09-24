import type {
  CategoryAttribute,
  NewCategoryAttribute,
} from "@domain/entities/category";

type ExistingAttribute = Pick<
  CategoryAttribute,
  "key" | "label" | "type" | "options"
>;

export function diffCategoryAttributes(
  existing: ExistingAttribute[],
  desired: NewCategoryAttribute[],
) {
  const oldByKey = new Map(
    existing.map((attribute) => [attribute.key, attribute]),
  );
  const desiredKeys = new Set(desired.map((attribute) => attribute.key));
  const insert: NewCategoryAttribute[] = [];
  const update: NewCategoryAttribute[] = [];

  for (const attribute of desired) {
    const old = oldByKey.get(attribute.key);
    if (!old) {
      insert.push(attribute);
      continue;
    }

    const oldOptions = old.options;
    const newOptions = attribute.options ?? null;
    const optionsChanged =
      oldOptions === null || newOptions === null
        ? oldOptions !== newOptions
        : oldOptions.length !== newOptions.length ||
          oldOptions.some((option, index) => option !== newOptions[index]);
    if (
      old.label !== attribute.label ||
      old.type !== attribute.type ||
      optionsChanged
    )
      update.push(attribute);
  }

  return {
    insert,
    update,
    remove: existing
      .filter((attribute) => !desiredKeys.has(attribute.key))
      .map((attribute) => attribute.key),
  };
}
