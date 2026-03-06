import type { AuthoringGraphQLClient } from "@/lib/authoring-client";
import { OPERATORS_SOURCE_PATH } from "@/lib/field-config";

export interface Option {
  itemId: string;
  name: string;
}

export interface GetPossibleOperatorsParams {
  client: AuthoringGraphQLClient;
  contextId: string;
  folderPath?: string;
}

export interface GetPossibleOperatorsResult {
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
 * Fetches all possible operators (children of the Operators folder).
 */
export async function getPossibleOperators({
  client,
  contextId,
  folderPath = OPERATORS_SOURCE_PATH,
}: GetPossibleOperatorsParams): Promise<GetPossibleOperatorsResult> {
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
    console.error("Failed to load possible operators", err);
    return {
      options: [],
      error:
        err instanceof Error ? err.message : "Could not load operators",
    };
  }
}
