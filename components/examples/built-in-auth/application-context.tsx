import {
  useAppContext,
  useMarketplaceClient,
  usePagesContext,
} from "@/components/providers/marketplace";
import { Badge } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// GraphQL query to load current page item and all field values via Authoring API.
// Include fields(ownFields: false, excludeStandardFields: false) so all fields are returned.
// See https://doc.sitecore.com/mp/en/developers/sdk/latest/sitecore-marketplace-sdk/make-a-graphql-query.html
const GET_PAGE_ITEM_FIELDS_QUERY = `
  query GetPageItemFields($path: String!, $language: String) {
    item(path: $path, language: $language) {
      id
      name
      path
      template {
        id
        name
      }
      fields(ownFields: false, excludeStandardFields: false) {
        name
        value
      }
    }
  }
`;

/** Try to get the current page item path from pages context (SDK shape may vary). */
function getPageItemPath(
  pagesContext: Record<string, unknown> | null
): string | undefined {
  if (!pagesContext) return undefined;
  const pageInfo = pagesContext.pageInfo as Record<string, unknown> | undefined;
  if (pageInfo?.path && typeof pageInfo.path === "string") return pageInfo.path;
  if (pageInfo?.itemPath && typeof pageInfo.itemPath === "string")
    return pageInfo.itemPath;
  if (typeof (pagesContext as { path?: string }).path === "string")
    return (pagesContext as { path: string }).path;
  const route = (pagesContext as { route?: { path?: string } }).route;
  if (route?.path && typeof route.path === "string") return route.path;
  return undefined;
}

/**
 * Displays Application Context, Page Context, and page item field values.
 * Field values are loaded via Authoring GraphQL when a page is open.
 */
export const ApplicationContext = () => {
  const client = useMarketplaceClient();
  const appContext = useAppContext();
  const pagesContext = usePagesContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pageItemFields, setPageItemFields] = useState<Record<string, unknown> | null>(null);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const contextId = appContext?.resourceAccess?.[0]?.context?.preview as
    | string
    | undefined;
  const pagePath = pagesContext ? getPageItemPath(pagesContext as Record<string, unknown>) : undefined;

  const loadPageItemFields = useCallback(async () => {
    if (!client || !contextId || !pagePath) {
      setPageItemFields(null);
      return;
    }
    setFieldsLoading(true);
    setFieldsError(null);
    try {
      const res = await client.mutate("xmc.authoring.graphql", {
        params: {
          query: { sitecoreContextId: contextId },
          body: {
            query: GET_PAGE_ITEM_FIELDS_QUERY,
            variables: { path: pagePath, language: "en" },
          },
        },
      });
      const data = res?.data as Record<string, unknown> | undefined;
      const item = data?.item as Record<string, unknown> | undefined;
      setPageItemFields(item ?? null);
    } catch (err) {
      console.error("Failed to load page item fields via GraphQL", err);
      setFieldsError(err instanceof Error ? err.message : "Failed to load field values");
      setPageItemFields(null);
    } finally {
      setFieldsLoading(false);
    }
  }, [client, contextId, pagePath]);

  useEffect(() => {
    loadPageItemFields();
  }, [loadPageItemFields]);

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className="border rounded-lg"
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50  p-6 rounded-t-lg transition-colors">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              Application &amp; Page Context
            </CardTitle>
            <Badge colorScheme="primary">Client-side</Badge>
            <Badge colorScheme={"success"}>SDK Built-in Auth</Badge>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 transition-transform" />
          ) : (
            <ChevronRight className="h-4 w-4 transition-transform" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 space-y-4">
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              Application context (application.context)
            </h3>
            <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
              {JSON.stringify(appContext, null, 2)}
            </pre>
          </section>
          {pagesContext ? (
            <>
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  Page context (pages.context)
                </h3>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                  {JSON.stringify(pagesContext, null, 2)}
                </pre>
              </section>
              {pagePath ? (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Page item field values (Authoring GraphQL)
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    Path: <code className="bg-muted px-1 rounded">{pagePath}</code>
                  </p>
                  {fieldsLoading && (
                    <p className="text-sm text-muted-foreground">Loading fields…</p>
                  )}
                  {fieldsError && (
                    <p className="text-sm text-destructive">{fieldsError}</p>
                  )}
                  {!fieldsLoading && !fieldsError && pageItemFields && (
                    <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                      {JSON.stringify(pageItemFields, null, 2)}
                    </pre>
                  )}
                </section>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No page path in context. Open a page in the Page builder to resolve the item and load field values.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Page context not available (open a page in the Page builder to see
              page context and field values).
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
