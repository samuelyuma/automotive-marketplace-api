import type {
  Category,
  CategoryAttribute,
  CategoryDetail,
  CategoryTreeNode,
  CategoryWithAttributes,
  UpdatedCategoryWithAttributes,
} from "../../domain/entities/category";

function toBaseCategory({
  created_at: _createdAt,
  updated_at: _updatedAt,
  ...fields
}: Category) {
  return fields;
}

function toBaseAttribute({
  created_at: _createdAt,
  updated_at: _updatedAt,
  deleted_at: _deletedAt,
  ...fields
}: CategoryAttribute) {
  return fields;
}

function toCategorySummary(category: Category) {
  return {
    ...toBaseCategory(category),
    created_at: category.created_at.toISOString(),
    updated_at: category.updated_at.toISOString(),
  };
}

function toDetailAttribute(attribute: CategoryAttribute) {
  return {
    ...toBaseAttribute(attribute),
    created_at: attribute.created_at.toISOString(),
    updated_at: attribute.updated_at.toISOString(),
  };
}

type CategoryTreePresenterNode = Omit<
  ReturnType<typeof toCategorySummary>,
  "attributes"
> & {
  attributes: ReturnType<typeof toDetailAttribute>[];
  children: CategoryTreePresenterNode[];
};

export function toCategoryDetail({ category, children }: CategoryDetail) {
  return {
    ...toBaseCategory(category),
    created_at: category.created_at.toISOString(),
    updated_at: category.updated_at.toISOString(),
    attributes: category.attributes.map(toDetailAttribute),
    children: children.map(toCategorySummary),
  };
}

function toTreeNode(category: CategoryTreeNode): CategoryTreePresenterNode {
  return {
    ...toCategorySummary(category),
    attributes: category.attributes.map(toDetailAttribute),
    children: category.children.map(toTreeNode),
  };
}

export function toCategoryTree(categories: CategoryTreeNode[]) {
  return categories.map(toTreeNode);
}

export function toCreatedCategory(category: CategoryWithAttributes) {
  return {
    ...toBaseCategory(category),
    created_at: category.created_at.toISOString(),
    attributes: category.attributes.map((attribute) => ({
      ...toBaseAttribute(attribute),
      created_at: attribute.created_at.toISOString(),
    })),
  };
}

export function toUpdatedCategory(category: UpdatedCategoryWithAttributes) {
  return {
    ...toBaseCategory(category),
    updated_at: category.updated_at.toISOString(),
    attributes: [
      ...category.attributes.map((attribute) => ({
        ...toBaseAttribute(attribute),
        updated_at: attribute.updated_at.toISOString(),
      })),
      ...category.deleted_attributes.map((attribute) => ({
        id: attribute.id,
        deleted_at: attribute.deleted_at.toISOString(),
      })),
    ],
  };
}
