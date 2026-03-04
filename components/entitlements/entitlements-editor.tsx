"use client";

import {
  useAppContext,
  useMarketplaceClient,
  usePagesContext,
} from "@/components/providers/marketplace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatItemIdAsGuid } from "@/lib/entitlements";
import {
  type EntitlementOption,
  getPossibleEntitlements,
} from "@/lib/possible-entitlements";
import { saveEntitlements } from "@/lib/save-entitlements";
import {
  type AuthoringGraphQLClient,
  getSelectedEntitlements,
} from "@/lib/selected-entitlements";
import React, { useCallback, useEffect, useState } from "react";

export function EntitlementsEditor() {
  const client = useMarketplaceClient();
  const appContext = useAppContext();
  const pagesContext = usePagesContext();

  const rawPageId = pagesContext?.pageInfo?.id ?? undefined;
  const pageId =
    rawPageId && rawPageId.startsWith("{")
      ? rawPageId
      : rawPageId
        ? `{${rawPageId}}`
        : undefined;
  const contextId = appContext?.resourceAccess?.[0]?.context?.preview as
    | string
    | undefined;

  const [entitlementOptions, setEntitlementOptions] = useState<
    EntitlementOption[]
  >([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [fieldAvailable, setFieldAvailable] = useState(true);
  const [selectedGuids, setSelectedGuids] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!client || !contextId || !pageId) return;

    const load = async () => {
      setFieldsLoading(true);
      setFieldsError(null);
      const {
        entitlementIds: ids,
        error,
        fieldAvailable: available,
      } = await getSelectedEntitlements({
        client: client as AuthoringGraphQLClient,
        contextId,
        pageId,
      });
      setSelectedGuids(new Set(ids.map((id) => formatItemIdAsGuid(id))));
      setFieldsError(error);
      setFieldAvailable(available);
      setFieldsLoading(false);
    };

    void load();
  }, [client, contextId, pageId]);

  useEffect(() => {
    if (!client || !contextId) return;

    const load = async () => {
      setOptionsLoading(true);
      setOptionsError(null);
      const { options, error } = await getPossibleEntitlements({
        client: client as AuthoringGraphQLClient,
        contextId,
      });
      setEntitlementOptions(options);
      setOptionsError(error);
      setOptionsLoading(false);
    };

    void load();
  }, [client, contextId]);

  const handleToggle = useCallback(
    async (valueGuid: string, checked: boolean) => {
      if (!client || !contextId || !pageId) return;
      const next = new Set(selectedGuids);
      if (checked) next.add(valueGuid);
      else next.delete(valueGuid);
      setSelectedGuids(next);
      setSaveError(null);
      const { error } = await saveEntitlements({
        client: client as AuthoringGraphQLClient,
        contextId,
        pageId,
        entitlementIds: Array.from(next),
      });
      if (error) {
        setSaveError(error);
        setSelectedGuids(selectedGuids);
      }
    },
    [client, contextId, pageId, selectedGuids],
  );

  return (
    <Card style="outline">
      <CardHeader>
        <CardTitle>Entitlements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pageId && !fieldAvailable && !fieldsLoading && !fieldsError && (
          <p className="text-sm text-muted-foreground">
            Entitlements cannot be configured for this page. The entitlements
            field is missing on the template.
          </p>
        )}
        {pageId && fieldAvailable && (
          <div className="space-y-2">
            <div className="space-y-2 pt-2">
              {optionsLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : optionsError ? (
                <p className="text-sm text-red-600">{optionsError}</p>
              ) : entitlementOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No child items found.
                </p>
              ) : (
                <ul className="text-sm space-y-2 list-none p-0 m-0">
                  {entitlementOptions.map((opt) => {
                    const valueGuid = formatItemIdAsGuid(opt.itemId);
                    const isChecked = selectedGuids.has(valueGuid);
                    return (
                      <li key={valueGuid} className="flex items-center gap-2">
                        <Checkbox
                          id={valueGuid}
                          value={valueGuid}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleToggle(valueGuid, checked === true)
                          }
                          aria-label={opt.name}
                        />
                        <label
                          htmlFor={valueGuid}
                          className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {opt.name}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {fieldAvailable && entitlementOptions.length > 0 && saveError && (
              <p className="text-sm text-red-600 pt-2">{saveError}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
