const categoryModules = import.meta.glob(
  "./categories/*.{svg,png,webp,jpg,jpeg}",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const foodModules = import.meta.glob(
  "./food/*.{svg,png,webp,jpg,jpeg}",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

function resolveByAssetId(
  modules: Record<string, string>,
  assetId: string,
): string | null {
  const normalized = assetId.toLowerCase().replace(/_/g, "-");
  const entry = Object.entries(modules).find(([path]) => {
    const filename = path.split("/").pop()?.toLowerCase() ?? "";
    const stem = filename.replace(/\.(svg|png|webp|jpe?g)$/i, "");
    return stem === normalized || stem === assetId.toLowerCase();
  });
  return entry?.[1] ?? null;
}

export function resolveCategoryAsset(assetId: string): string | null {
  return resolveByAssetId(categoryModules, assetId);
}

export function resolveFoodAsset(assetId: string): string | null {
  return resolveByAssetId(foodModules, assetId);
}
