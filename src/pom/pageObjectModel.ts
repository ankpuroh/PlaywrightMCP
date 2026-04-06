export interface PageObjectDefinition {
  [elementName: string]: string;
}

export interface PageObjectModel {
  [pageName: string]: PageObjectDefinition;
}

/**
 * Flatten a POM structure into selector aliases the executor already understands.
 * Example: LoginPage.username -> #username
 */
export function flattenPageObjectsToSelectors(
  pom: PageObjectModel
): Record<string, string> {
  const flattened: Record<string, string> = {};

  for (const [pageName, elements] of Object.entries(pom)) {
    for (const [elementName, selector] of Object.entries(elements)) {
      const qualifiedKey = `${pageName}.${elementName}`;
      flattened[qualifiedKey] = selector;

      // Keep bare element key as convenience fallback if not already defined.
      if (!flattened[elementName]) {
        flattened[elementName] = selector;
      }
    }
  }

  return flattened;
}
