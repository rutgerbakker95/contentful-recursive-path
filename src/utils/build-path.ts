interface Page {
  slug: string;
  sys: {
    id: string;
  };
  parent?: {
    sys: {
      id: string;
    };
  };
}

/**
 * Builds a path for a given page based on its parent pages
 * This utility is shared between client and server code
 */
export function buildPath(page: Page, allPages: Page[]): string[] {
  const path = [page.slug];
  let current = page;
  while (current.parent) {
    const parent = allPages.find((p) => p.sys.id === current.parent?.sys.id);
    if (!parent) break;
    path.unshift(parent.slug);
    current = parent;
  }
  return path.filter((slug): slug is string => slug !== undefined);
}
