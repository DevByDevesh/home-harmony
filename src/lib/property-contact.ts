export function propertyContactRedirect(slug: string) {
  return `/property/${encodeURIComponent(slug)}?contact=true`;
}
