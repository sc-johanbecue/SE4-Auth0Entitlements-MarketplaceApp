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
