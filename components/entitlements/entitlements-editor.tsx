"use client";

import {
  useAppContext,
  useMarketplaceClient,
  usePagesContext,
} from "@/components/providers/marketplace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup } from "@/components/ui/radio-group";
import {
  ENTITLEMENTS_FIELD_NAME,
  ENTITLEMENTS_OPERATOR_FIELD_NAME,
  OPERATOR_FIELD_TITLE,
  ROLES_FIELD_NAME,
  ROLES_OPERATOR_FIELD_NAME,
} from "@/lib/field-config";
import { formatItemIdAsGuid } from "@/lib/entitlements";
import {
  type EntitlementOption,
  getPossibleEntitlements,
} from "@/lib/possible-entitlements";
import {
  getPossibleOperators,
  type Option as OperatorOption,
} from "@/lib/possible-operators";
import {
  getPossibleRoles,
  type Option as RoleOption,
} from "@/lib/possible-roles";
import { saveDroplink } from "@/lib/save-droplink";
import { saveField } from "@/lib/save-field";
import {
  type AuthoringGraphQLClient,
  getSelectedEntitlements,
} from "@/lib/selected-entitlements";
import { getSelectedDroplink } from "@/lib/selected-droplink";
import { getSelectedField } from "@/lib/selected-field";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_OPERATOR_NAME = "Any";

interface CheckboxListProps {
  options: { itemId: string; name: string }[];
  selectedGuids: Set<string>;
  onToggle: (valueGuid: string, checked: boolean) => void;
  loading: boolean;
  error: string | null;
  emptyMessage: string;
}

function CheckboxList({
  options,
  selectedGuids,
  onToggle,
  loading,
  error,
  emptyMessage,
}: CheckboxListProps) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (options.length === 0) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  return (
    <ul className="text-sm space-y-2 list-none p-0 m-0">
      {options.map((opt) => {
        const valueGuid = formatItemIdAsGuid(opt.itemId);
        const isChecked = selectedGuids.has(valueGuid);
        return (
          <li key={valueGuid} className="flex items-center gap-2">
            <Checkbox
              id={valueGuid}
              value={valueGuid}
              checked={isChecked}
              onCheckedChange={(checked) => onToggle(valueGuid, checked === true)}
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
  );
}

function getDefaultOperatorId(options: { itemId: string; name: string }[]): string | null {
  const anyOpt = options.find((o) => o.name === DEFAULT_OPERATOR_NAME);
  return anyOpt ? formatItemIdAsGuid(anyOpt.itemId) : options[0] ? formatItemIdAsGuid(options[0].itemId) : null;
}

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

  // Entitlements section
  const [entitlementOptions, setEntitlementOptions] = useState<
    EntitlementOption[]
  >([]);
  const [operatorOptions, setOperatorOptions] = useState<OperatorOption[]>([]);
  const [entitlementsLoading, setEntitlementsLoading] = useState(false);
  const [entitlementsFieldAvailable, setEntitlementsFieldAvailable] =
    useState(true);
  const [selectedEntitlements, setSelectedEntitlements] = useState<Set<string>>(
    new Set(),
  );
  const [selectedEntitlementsOperator, setSelectedEntitlementsOperator] =
    useState<string | null>(null);
  const [entitlementsError, setEntitlementsError] = useState<string | null>(null);
  const [entitlementsOperatorError, setEntitlementsOperatorError] = useState<
    string | null
  >(null);
  const [entitlementsSaveError, setEntitlementsSaveError] = useState<
    string | null
  >(null);

  // Roles section
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesFieldAvailable, setRolesFieldAvailable] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [selectedRolesOperator, setSelectedRolesOperator] = useState<
    string | null
  >(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [rolesOperatorError, setRolesOperatorError] = useState<string | null>(
    null,
  );
  const [rolesSaveError, setRolesSaveError] = useState<string | null>(null);

  const operatorRadioOptions = useMemo(
    () =>
      operatorOptions.map((o) => ({
        value: formatItemIdAsGuid(o.itemId),
        label: o.name,
      })),
    [operatorOptions],
  );
  const defaultEntitlementsOperatorId = useMemo(
    () => getDefaultOperatorId(operatorOptions),
    [operatorOptions],
  );
  const defaultRolesOperatorId = useMemo(
    () => getDefaultOperatorId(operatorOptions),
    [operatorOptions],
  );

  // Load entitlements + operator (initial load)
  useEffect(() => {
    if (!client || !contextId || !pageId) return;
    const load = async () => {
      setEntitlementsLoading(true);
      setEntitlementsError(null);
      const [entRes, opRes] = await Promise.all([
        getSelectedEntitlements({
          client: client as AuthoringGraphQLClient,
          contextId,
          pageId,
        }),
        getSelectedDroplink({
          client: client as AuthoringGraphQLClient,
          contextId,
          pageId,
          fieldName: ENTITLEMENTS_OPERATOR_FIELD_NAME,
        }),
      ]);
      setSelectedEntitlements(
        new Set(entRes.entitlementIds.map((id) => formatItemIdAsGuid(id))),
      );
      setSelectedEntitlementsOperator(opRes.id);
      setEntitlementsFieldAvailable(entRes.fieldAvailable);
      setEntitlementsError(entRes.error);
      setEntitlementsOperatorError(opRes.error);
      setEntitlementsLoading(false);
    };
    void load();
  }, [client, contextId, pageId]);

  // Load roles + operator
  useEffect(() => {
    if (!client || !contextId || !pageId) return;
    const load = async () => {
      setRolesLoading(true);
      setRolesError(null);
      const [rolesRes, opRes] = await Promise.all([
        getSelectedField({
          client: client as AuthoringGraphQLClient,
          contextId,
          pageId,
          fieldName: ROLES_FIELD_NAME,
        }),
        getSelectedDroplink({
          client: client as AuthoringGraphQLClient,
          contextId,
          pageId,
          fieldName: ROLES_OPERATOR_FIELD_NAME,
        }),
      ]);
      setSelectedRoles(
        new Set(rolesRes.ids.map((id) => formatItemIdAsGuid(id))),
      );
      setSelectedRolesOperator(opRes.id);
      setRolesFieldAvailable(rolesRes.fieldAvailable);
      setRolesError(rolesRes.error);
      setRolesOperatorError(opRes.error);
      setRolesLoading(false);
    };
    void load();
  }, [client, contextId, pageId]);

  const [optionsLoading, setOptionsLoading] = useState(false);
  useEffect(() => {
    if (!client || !contextId) return;
    const load = async () => {
      setOptionsLoading(true);
      const [ent, ops, roles] = await Promise.all([
        getPossibleEntitlements({ client: client as AuthoringGraphQLClient, contextId }),
        getPossibleOperators({ client: client as AuthoringGraphQLClient, contextId }),
        getPossibleRoles({ client: client as AuthoringGraphQLClient, contextId }),
      ]);
      setEntitlementOptions(ent.options);
      setOperatorOptions(ops.options);
      setRoleOptions(roles.options);
      setOptionsLoading(false);
    };
    void load();
  }, [client, contextId]);

  const createToggleHandler = useCallback(
    (
      fieldName: string,
      setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
      selected: Set<string>,
      setSaveError: React.Dispatch<React.SetStateAction<string | null>>,
    ) =>
      async (valueGuid: string, checked: boolean) => {
        if (!client || !contextId || !pageId) return;
        const next = new Set(selected);
        if (checked) next.add(valueGuid);
        else next.delete(valueGuid);
        setSelected(next);
        setSaveError(null);
        const { error } = await saveField({
          client: client as AuthoringGraphQLClient,
          contextId,
          pageId,
          fieldName,
          ids: Array.from(next),
        });
        if (error) {
          setSaveError(error);
          setSelected(selected);
        }
      },
    [client, contextId, pageId],
  );

  const createOperatorChangeHandler = useCallback(
    (
      fieldName: string,
      setSelected: React.Dispatch<React.SetStateAction<string | null>>,
      setSaveError: React.Dispatch<React.SetStateAction<string | null>>,
    ) =>
      async (value: string) => {
        if (!client || !contextId || !pageId) return;
        setSelected(value);
        setSaveError(null);
        const { error } = await saveDroplink({
          client: client as AuthoringGraphQLClient,
          contextId,
          pageId,
          fieldName,
          id: value,
        });
        if (error) {
          setSaveError(error);
        }
      },
    [client, contextId, pageId],
  );

  const handleEntitlementsToggle = createToggleHandler(
    ENTITLEMENTS_FIELD_NAME,
    setSelectedEntitlements,
    selectedEntitlements,
    setEntitlementsSaveError,
  );
  const handleEntitlementsOperatorChange = createOperatorChangeHandler(
    ENTITLEMENTS_OPERATOR_FIELD_NAME,
    setSelectedEntitlementsOperator,
    setEntitlementsSaveError,
  );
  const handleRolesToggle = createToggleHandler(
    ROLES_FIELD_NAME,
    setSelectedRoles,
    selectedRoles,
    setRolesSaveError,
  );
  const handleRolesOperatorChange = createOperatorChangeHandler(
    ROLES_OPERATOR_FIELD_NAME,
    setSelectedRolesOperator,
    setRolesSaveError,
  );

  const entitlementsUnavailable =
    pageId &&
    !entitlementsFieldAvailable &&
    !entitlementsLoading &&
    !entitlementsError;
  const rolesUnavailable =
    pageId && !rolesFieldAvailable && !rolesLoading && !rolesError;

  const displayEntitlementsOperator =
    selectedEntitlementsOperator ?? defaultEntitlementsOperatorId;
  const displayRolesOperator =
    selectedRolesOperator ?? defaultRolesOperatorId;

  return (
    <Card style="outline">
      <CardHeader>
        <CardTitle>Entitlements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {pageId && entitlementsUnavailable && (
          <p className="text-sm text-muted-foreground">
            Entitlements cannot be configured for this page. The entitlements
            field is missing on the template.
          </p>
        )}
        {pageId && entitlementsFieldAvailable && (
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium block">
                {OPERATOR_FIELD_TITLE}
              </span>
              {entitlementsOperatorError ? (
                <p className="text-sm text-red-600">{entitlementsOperatorError}</p>
              ) : (
                <RadioGroup
                  name="entitlements-operator"
                  options={operatorRadioOptions}
                  value={displayEntitlementsOperator}
                  onChange={handleEntitlementsOperatorChange}
                  disabled={entitlementsLoading || optionsLoading}
                />
              )}
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium block">
                {OPERATOR_FIELD_TITLE}
              </span>
              <CheckboxList
                options={entitlementOptions}
                selectedGuids={selectedEntitlements}
                onToggle={handleEntitlementsToggle}
                loading={entitlementsLoading || optionsLoading}
                error={entitlementsError}
                emptyMessage="No entitlements found."
              />
            </div>
            {entitlementsSaveError && (
              <p className="text-sm text-red-600">{entitlementsSaveError}</p>
            )}
          </div>
        )}

        <div className="pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4">Roles</h3>
          {pageId && rolesUnavailable && (
            <p className="text-sm text-muted-foreground">
              Roles cannot be configured for this page. The roles field is
              missing on the template.
            </p>
          )}
          {pageId && rolesFieldAvailable && (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-sm font-medium block">
                  {ROLES_OPERATOR_FIELD_NAME}
                </span>
                {rolesOperatorError ? (
                  <p className="text-sm text-red-600">{rolesOperatorError}</p>
                ) : (
                  <RadioGroup
                    name="roles-operator"
                    options={operatorRadioOptions}
                    value={displayRolesOperator}
                    onChange={handleRolesOperatorChange}
                    disabled={rolesLoading || optionsLoading}
                  />
                )}
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium block">
                  {ROLES_FIELD_NAME}
                </span>
                <CheckboxList
                  options={roleOptions}
                  selectedGuids={selectedRoles}
                  onToggle={handleRolesToggle}
                  loading={rolesLoading || optionsLoading}
                  error={rolesError}
                  emptyMessage="No roles found."
                />
              </div>
              {rolesSaveError && (
                <p className="text-sm text-red-600">{rolesSaveError}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
