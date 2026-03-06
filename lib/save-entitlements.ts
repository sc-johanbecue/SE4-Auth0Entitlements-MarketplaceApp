import type { AuthoringGraphQLClient } from "@/lib/authoring-client";
import { ENTITLEMENTS_FIELD_NAME } from "@/lib/entitlements";
import { saveField } from "@/lib/save-field";

export interface SaveEntitlementsParams {
  client: AuthoringGraphQLClient;
  contextId: string;
  pageId: string;
  entitlementIds: string[];
}

export interface SaveEntitlementsResult {
  success: boolean;
  error: string | null;
}

/**
 * Writes the given entitlement IDs to the Entitlements field of the page item.
 */
export async function saveEntitlements({
  client,
  contextId,
  pageId,
  entitlementIds,
}: SaveEntitlementsParams): Promise<SaveEntitlementsResult> {
  return saveField({
    client,
    contextId,
    pageId,
    fieldName: ENTITLEMENTS_FIELD_NAME,
    ids: entitlementIds,
  });
}
