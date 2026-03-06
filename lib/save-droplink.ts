import type { AuthoringGraphQLClient } from "@/lib/authoring-client";

export interface SaveDroplinkParams {
  client: AuthoringGraphQLClient;
  contextId: string;
  pageId: string;
  fieldName: string;
  /** Single GUID (no pipe-separated list). */
  id: string;
}

export interface SaveDroplinkResult {
  success: boolean;
  error: string | null;
}

function escapeGraphQLString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const buildUpdateFieldMutation = (
  itemId: string,
  fieldName: string,
  value: string,
) => `
  mutation {
    updateItem(
      input: {
        database: "master"
        itemId: "${itemId}"
        fields: [
          { name: "${fieldName}", value: "${escapeGraphQLString(value)}" }
        ]
      }
    ) {
      item {
        itemId
        name
      }
    }
  }
`;

/**
 * Writes a single GUID to a droplink field on the page item.
 */
export async function saveDroplink({
  client,
  contextId,
  pageId,
  fieldName,
  id,
}: SaveDroplinkParams): Promise<SaveDroplinkResult> {
  try {
    const query = buildUpdateFieldMutation(pageId, fieldName, id);

    const res = await client.mutate("xmc.authoring.graphql", {
      params: {
        query: { sitecoreContextId: contextId },
        body: { query },
      },
    });

    const wrapper = res?.data as
      | { data?: { updateItem?: { item?: unknown } }; errors?: unknown[] }
      | undefined;

    const errors = wrapper?.errors;
    if (errors && Array.isArray(errors) && errors.length > 0) {
      const msg = errors
        .map((e: unknown) => (e as { message?: string })?.message ?? String(e))
        .join("; ");
      return { success: false, error: msg };
    }

    const item = wrapper?.data?.updateItem?.item;
    if (item == null) {
      return { success: false, error: "Update did not return the item" };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error(`Failed to save droplink field ${fieldName}`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save",
    };
  }
}
