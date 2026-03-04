import {
  ENTITLEMENTS_FIELD_NAME,
  parseEntitlementsValue,
} from "@/lib/entitlements";

/** Client shape required for authoring GraphQL (avoids depending on SDK in lib). */
export interface AuthoringGraphQLClient {
  mutate(
    key: "xmc.authoring.graphql",
    opts: {
      params: {
        query: { sitecoreContextId: string };
        body: { query: string };
      };
    },
  ): Promise<{ data?: unknown }>;
}

export interface GetSelectedEntitlementsParams {
  client: AuthoringGraphQLClient;
  contextId: string;
  /** Current page/item ID (with or without braces) */
  pageId: string;
}

export interface GetSelectedEntitlementsResult {
  entitlementIds: string[];
  error: string | null;
  /** False when the page item has no Entitlements field (e.g. template does not include it). */
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
 * Fetches the current page/item and returns the selected entitlement IDs from its Entitlements field.
 */
export async function getSelectedEntitlements({
  client,
  contextId,
  pageId,
}: GetSelectedEntitlementsParams): Promise<GetSelectedEntitlementsResult> {
  try {
    const res = await client.mutate("xmc.authoring.graphql", {
      params: {
        query: { sitecoreContextId: contextId },
        body: {
          query: buildGetItemFieldsQuery(pageId),
        },
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
    const entitlementsField = nodes.find(
      (n: { name: string }) => n.name === ENTITLEMENTS_FIELD_NAME,
    );
    const entitlementIds = parseEntitlementsValue(
      entitlementsField?.value ?? null,
    );
    const fieldAvailable = Boolean(item && entitlementsField != null);

    return { entitlementIds, error: null, fieldAvailable };
  } catch (err) {
    console.error("Failed to load selected entitlements", err);
    return {
      entitlementIds: [],
      error: err instanceof Error ? err.message : "Could not load page fields",
      fieldAvailable: false,
    };
  }
}
