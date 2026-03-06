import { ENTITLEMENTS_FIELD_NAME } from "@/lib/entitlements";
import { getSelectedField } from "@/lib/selected-field";

export type { AuthoringGraphQLClient } from "@/lib/authoring-client";

export interface GetSelectedEntitlementsParams {
  client: import("@/lib/authoring-client").AuthoringGraphQLClient;
  contextId: string;
  pageId: string;
}

export interface GetSelectedEntitlementsResult {
  entitlementIds: string[];
  error: string | null;
  fieldAvailable: boolean;
}

/**
 * Fetches the current page/item and returns the selected entitlement IDs from its Entitlements field.
 */
export async function getSelectedEntitlements({
  client,
  contextId,
  pageId,
}: GetSelectedEntitlementsParams): Promise<GetSelectedEntitlementsResult> {
  const { ids, error, fieldAvailable } = await getSelectedField({
    client,
    contextId,
    pageId,
    fieldName: ENTITLEMENTS_FIELD_NAME,
  });
  return {
    entitlementIds: ids,
    error,
    fieldAvailable,
  };
}
