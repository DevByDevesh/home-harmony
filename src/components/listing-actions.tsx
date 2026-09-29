import { GitCompareArrows, Heart } from "lucide-react";
import { toast } from "sonner";
import { userActions, useUserData } from "@/lib/user-data";
import { COMPARE_LIMIT } from "@/lib/compare";
import type { Listing } from "@/lib/catalog";

export function SaveButton({ home, variant = "icon" }: { home: Listing; variant?: "icon" | "full" }) {
  const { data } = useUserData();
  const saved = data.saved.includes(home.slug);
  return <button type="button" className={`save-button ${variant}`} aria-pressed={saved} aria-label={saved ? `Remove ${home.name} from saved` : `Save ${home.name}`}
    onClick={e => { e.preventDefault(); userActions.toggleSaved(home.slug, home.name); toast(saved ? "Removed from saved" : "Saved on this device"); }}>
    <Heart size={17} fill={saved ? "currentColor" : "none"} />{variant === "full" && <span>{saved ? "Saved" : "Save"}</span>}
  </button>;
}
export function CompareButton({ home, variant = "icon" }: { home: Listing; variant?: "icon" | "full" }) {
  const { data } = useUserData();
  const active = data.compare.includes(home.slug);
  return <button type="button" className={`compare-button ${variant}`} aria-pressed={active} aria-label={active ? `Remove ${home.name} from comparison` : `Add ${home.name} to comparison`}
    onClick={e => { e.preventDefault(); if (!userActions.toggleCompare(home.slug)) toast.error(`You can compare up to ${COMPARE_LIMIT} properties. Remove one first.`); }}>
    <GitCompareArrows size={17} />{variant === "full" && <span>{active ? "Comparing" : "Compare"}</span>}
  </button>;
}
