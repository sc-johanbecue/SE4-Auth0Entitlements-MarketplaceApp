import type { AuthoringGraphQLClient } from "@/lib/authoring-client";
import { parseEntitlementsValue } from "@/lib/entitlements";

export interface GetSelectedFieldParams {
  client: AuthoringGraphQLClient;
  contextId: string;
  pageId: string;
  fieldName: string;
}

export interface GetSelectedFieldResult {
  ids: string[];
  error: string | null;
  fieldAvailable: boolean;
}

const buildGetItemFieldsQuery = (itemId: string) => `
  query {
    item(
      where: {
        database: "master"
        itemId: "${itemId}"
      }
    ) {
      itemId
      name
      path
      fields(ownFields: false, excludeStandardFields: true) {
        nodes {
          name
          value
        }
      }
    }
  }
`;

/**
 * Fetches the current page/item and returns the selected IDs from a multist list field.
 */
export async function getSelectedField({
  client,
  contextId,
  pageId,
  fieldName,
}: GetSelectedFieldParams): Promise<GetSelectedFieldResult> {
  try {
    const res = await client.mutate("xmc.authoring.graphql", {
      params: {
        query: { sitecoreContextId: contextId },
        body: { query: buildGetItemFieldsQuery(pageId) },
      },
    });

    const wrapper = res?.data as
      | {
          data?: {
            item?: {
              fields?: {
                nodes?: Array<{ name: string; value: unknown }>;
              };
            };
          };
        }
      | undefined;

    const item = wrapper?.data?.item;
    const nodes = item?.fields?.nodes ?? [];
    const field = nodes.find((n: { name: string }) => n.name === fieldName);
    const ids = parseEntitlementsValue(field?.value ?? null);
    const fieldAvailable = Boolean(item && field != null);

    return { ids, error: null, fieldAvailable };
  } catch (err) {
    console.error(`Failed to load field ${fieldName}`, err);
    return {
      ids: [],
      error:
        err instanceof Error ? err.message : "Could not load page fields",
      fieldAvailable: false,
    };
  }
}
