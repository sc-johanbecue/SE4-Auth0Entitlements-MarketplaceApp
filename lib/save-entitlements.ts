import {
  ENTITLEMENTS_FIELD_NAME,
  serializeEntitlementsValue,
} from "@/lib/entitlements";
import type { AuthoringGraphQLClient } from "@/lib/selected-entitlements";

export interface SaveEntitlementsParams {
  client: AuthoringGraphQLClient;
  contextId: string;
  /** Current page/item ID (with or without braces) */
  pageId: string;
  /** Selected entitlement IDs (GUIDs); will be serialized as pipe-separated. */
  entitlementIds: string[];
}

export interface SaveEntitlementsResult {
  success: boolean;
  error: string | null;
}

/** Escape a string for use inside a GraphQL double-quoted string. */
function escapeGraphQLString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const buildUpdateEntitlementsMutation = (
  itemId: string,
  entitlementsValue: string,
) => `
  mutation {
    updateItem(
      input: {
        database: "master"
        itemId: "${itemId}"
        fields: [
          { name: "${ENTITLEMENTS_FIELD_NAME}", value: "${escapeGraphQLString(entitlementsValue)}" }
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
 * Writes the given entitlement IDs to the Entitlements field of the page item in Sitecore.
 * Value is stored as a pipe-separated list of GUIDs.
 */
export async function saveEntitlements({
  client,
  contextId,
  pageId,
  entitlementIds,
}: SaveEntitlementsParams): Promise<SaveEntitlementsResult> {
  try {
    const entitlementsValue = serializeEntitlementsValue(entitlementIds);
    const query = buildUpdateEntitlementsMutation(pageId, entitlementsValue);

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
    console.error("Failed to save entitlements", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save entitlements",
    };
  }
}
