/**
 * Field names and source paths for multist list fields.
 * Used by Entitlements, EntitlementsOperator, Roles, and RolesOperator.
 */

export const ENTITLEMENTS_FIELD_NAME = "Entitlements";
export const ENTITLEMENTS_SOURCE_PATH =
  process.env.NEXT_PUBLIC_ENTITLEMENTS_SOURCE_PATH ||
  "/sitecore/content/malvern-panalytical/malvern-panalytical/Data/Entitlements";

export const ENTITLEMENTS_OPERATOR_FIELD_NAME = "EntitlementsOperator";
export const OPERATORS_SOURCE_PATH =
  process.env.NEXT_PUBLIC_OPERATORS_SOURCE_PATH ||
  "/sitecore/content/malvern-panalytical/malvern-panalytical/Data/Operators";

export const ROLES_FIELD_NAME = "Roles";
export const ROLES_SOURCE_PATH =
  process.env.NEXT_PUBLIC_ROLES_SOURCE_PATH ||
  "/sitecore/content/malvern-panalytical/malvern-panalytical/Data/Roles";

export const ROLES_OPERATOR_FIELD_NAME = "RolesOperator";
