import type { AuthoringGraphQLClient } from "@/lib/authoring-client";
import { ROLES_SOURCE_PATH } from "@/lib/field-config";

export interface Option {
  itemId: string;
  name: string;
}

export interface GetPossibleRolesParams {
  client: AuthoringGraphQLClient;
  contextId: string;
  folderPath?: string;
}

export interface GetPossibleRolesResult {
  options: Option[];
  error: string | null;
}

const buildGetFolderChildrenQuery = (path: string) => `
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
        }
      }
    }
  }
`;

/**
 * Fetches all possible roles (children of the Roles folder).
 */
export async function getPossibleRoles({
  client,
  contextId,
  folderPath = ROLES_SOURCE_PATH,
}: GetPossibleRolesParams): Promise<GetPossibleRolesResult> {
  try {
    const res = await client.mutate("xmc.authoring.graphql", {
      params: {
        query: { sitecoreContextId: contextId },
        body: { query: buildGetFolderChildrenQuery(folderPath) },
      },
    });

    const wrapper = res?.data as
      | {
          data?: {
            item?: {
              children?: {
                nodes?: Array<{ itemId?: string; name?: string }>;
              };
            };
          };
          item?: {
            children?: {
              nodes?: Array<{ itemId?: string; name?: string }>;
            };
          };
        }
      | undefined;

    const nodes =
      wrapper?.data?.item?.children?.nodes ??
      wrapper?.item?.children?.nodes ??
      [];

    const options: Option[] = nodes.map((r) => ({
      itemId: r.itemId ?? "",
      name: r.name ?? "",
    }));

    return { options, error: null };
  } catch (err) {
    console.error("Failed to load possible roles", err);
    return {
      options: [],
      error: err instanceof Error ? err.message : "Could not load roles",
    };
  }
}
