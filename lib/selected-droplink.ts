import type { AuthoringGraphQLClient } from "@/lib/authoring-client";
import { formatItemIdAsGuid } from "@/lib/entitlements";

export interface GetSelectedDroplinkParams {
  client: AuthoringGraphQLClient;
  contextId: string;
  pageId: string;
  fieldName: string;
}

export interface GetSelectedDroplinkResult {
  /** Single GUID or null when empty (default to "Any" in UI). */
  id: string | null;
  error: string | null;
  fieldAvailable: boolean;
}

/** Parse droplink field value (single GUID, not pipe-separated). */
function parseDroplinkValue(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const s = value.trim();
    return s ? formatItemIdAsGuid(s) : null;
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const id = o.id ?? o.targetId ?? o.guid;
    if (typeof id === "string" && id.trim()) return formatItemIdAsGuid(id);
  }
  return null;
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
 * Fetches the current page/item and returns the selected ID from a droplink field (single GUID).
 */
export async function getSelectedDroplink({
  client,
  contextId,
  pageId,
  fieldName,
}: GetSelectedDroplinkParams): Promise<GetSelectedDroplinkResult> {
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
    const id = parseDroplinkValue(field?.value ?? null);
    const fieldAvailable = Boolean(item && field != null);

    return { id, error: null, fieldAvailable };
  } catch (err) {
    console.error(`Failed to load droplink field ${fieldName}`, err);
    return {
      id: null,
      error:
        err instanceof Error ? err.message : "Could not load page fields",
      fieldAvailable: false,
    };
  }
}
