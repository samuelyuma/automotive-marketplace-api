import type {
  CategoryTreeNode,
  CategoryWithAttributes,
} from "../entities/category";

export function buildCategoryTree(
  categories: CategoryWithAttributes[],
): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>(
    categories.map((category) => [category.id, { ...category, children: [] }]),
  );
  const roots: CategoryTreeNode[] = [];

  for (const node of nodes.values()) {
    if (node.parent_id === null) {
      roots.push(node);
      continue;
    }
    const parent = nodes.get(node.parent_id);
    if (!parent)
      throw new Error("Category hierarchy has an unreachable parent");
    parent.children.push(node);
  }

  const sortChildren = (items: CategoryTreeNode[]) => {
    items.sort(
      (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
    );
    for (const item of items) sortChildren(item.children);
  };
  sortChildren(roots);
  return roots;
}
