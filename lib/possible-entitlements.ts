import type { AuthoringGraphQLClient } from "@/lib/authoring-client";
import { ENTITLEMENTS_SOURCE_PATH } from "@/lib/field-config";

export const AUTH0_FIELD_NAME = "Auth0";

export interface EntitlementOption {
  itemId: string;
  name: string;
  auth0Value: string;
}

export interface GetPossibleEntitlementsParams {
  client: AuthoringGraphQLClient;
  contextId: string;
  /** Optional: override the folder path (defaults to ENTITLEMENTS_SOURCE_PATH) */
  folderPath?: string;
}

export interface GetPossibleEntitlementsResult {
  options: EntitlementOption[];
  error: string | null;
}

const buildGetEntitlementsFolderChildrenQuery = (path: string) => `
  query {
    item(
      where: {
        database: "master"
        path: "${path}"
      }
    ) {
      itemId
      name
      children {
        nodes {
          itemId
          name
          fields(ownFields: true, excludeStandardFields: true) {
            nodes {
              name
              value
            }
          }
        }
      }
    }
  }
`;

/**
 * Fetches all possible entitlements (children of the Entitlements folder) with their Auth0 field value.
 */
export async function getPossibleEntitlements({
  client,
  contextId,
  folderPath = ENTITLEMENTS_SOURCE_PATH,
}: GetPossibleEntitlementsParams): Promise<GetPossibleEntitlementsResult> {
  try {
    const res = await client.mutate("xmc.authoring.graphql", {
      params: {
        query: { sitecoreContextId: contextId },
        body: {
          query: buildGetEntitlementsFolderChildrenQuery(folderPath),
        },
      },
    });

    const wrapper = res?.data as
      | {
          data?: {
            item?: {
              children?: {
                nodes?: Array<{
                  itemId?: string;
                  name?: string;
                  fields?: {
                    nodes?: Array<{ name: string; value: unknown }>;
                  };
                }>;
              };
            };
          };
          item?: {
            children?: {
              nodes?: Array<{
                itemId?: string;
                name?: string;
                fields?: {
                  nodes?: Array<{ name: string; value: unknown }>;
                };
              }>;
            };
          };
        }
      | undefined;

    const nodes =
      wrapper?.data?.item?.children?.nodes ??
      wrapper?.item?.children?.nodes ??
      [];

    const options: EntitlementOption[] = nodes.map((r) => {
      const auth0Node = r.fields?.nodes?.find(
        (n) => n.name === AUTH0_FIELD_NAME,
      );
      const auth0Value =
        typeof auth0Node?.value === "string" ? auth0Node.value : "";
      return {
        itemId: r.itemId ?? "",
        name: r.name ?? "",
        auth0Value,
      };
    });

    return { options, error: null };
  } catch (err) {
    console.error("Failed to load possible entitlements", err);
    return {
      options: [],
      error:
        err instanceof Error
          ? err.message
          : "Could not load entitlement options",
    };
  }
}
