/**
 * Entitlements field name and source path for the multist list.
 * Source is the Sitecore folder whose children can be selected as entitlement values.
 */
export const ENTITLEMENTS_FIELD_NAME = "Entitlements";
export const ENTITLEMENTS_SOURCE_PATH =
  "/sitecore/content/adp-digital-web-assets/ADP Portal/Data/Entitlements";

/**
 * Parse the raw Entitlements field value (multist list) into an array of item IDs.
 * Sitecore multist list typically stores pipe-separated GUIDs.
 */
export function parseEntitlementsValue(value: unknown): string[] {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") {
    return value
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (
    typeof value === "object" &&
    "targetIds" in value &&
    Array.isArray((value as { targetIds: string[] }).targetIds)
  ) {
    return (value as { targetIds: string[] }).targetIds;
  }
  return [];
}

/**
 * Serialize an array of item IDs to the format expected by the Entitlements field (pipe-separated).
 */
export function serializeEntitlementsValue(ids: string[]): string {
  return ids.filter(Boolean).join("|");
}

/** GUID pattern: 8-4-4-4-12 hex. Used to insert hyphens when missing. */
const GUID_HEX_LENGTH = 32;
const GUID_SEGMENTS = [8, 4, 4, 4, 12] as const;

/**
 * Format an item ID as a GUID with braces and uppercase hex, e.g. {B5E5D70F-E579-4FB4-87D0-0AEF3775F5C7}.
 * Accepts IDs with or without braces/hyphens and in any case. Inserts hyphens if the value is 32 hex chars.
 */
export function formatItemIdAsGuid(id: string): string {
  if (!id || typeof id !== "string") return id;
  const raw = id
    .replace(/^\{|\}$/g, "")
    .replace(/-/g, "")
    .trim()
    .toUpperCase();
  if (!raw) return id;
  if (raw.length === GUID_HEX_LENGTH && /^[0-9A-F]+$/.test(raw)) {
    let i = 0;
    const parts = GUID_SEGMENTS.map((len) => raw.slice(i, (i += len)));
    return `{${parts.join("-")}}`;
  }
  return `{${raw}}`;
}
