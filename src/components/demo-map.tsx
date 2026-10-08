import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { Listing } from "@/lib/catalog";

const MapboxCanvas = lazy(() => import("./mapbox-canvas"));

type Props = { homes: Listing[]; selected: string | null; hovered: string | null; onSelect: (slug: string) => void; onHover: (slug: string | null) => void; layer: "map" | "satellite" };

export function DemoMap(props: Props) {
  const placeholder = <div className="property-map map-loading" role="status">Loading map…</div>;
  return <ClientOnly fallback={placeholder}><Suspense fallback={placeholder}><MapboxCanvas {...props}/></Suspense></ClientOnly>;
}