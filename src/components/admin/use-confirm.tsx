import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Ask = { title: string; description: string; confirm: string; onConfirm: () => void };
/** Controlled confirmation for destructive actions triggered from menus. */
export function useConfirm() {
  const [ask, setAsk] = useState<Ask | null>(null);
  const dialog = <AlertDialog open={!!ask} onOpenChange={o => { if (!o) setAsk(null); }}><AlertDialogContent>
    <AlertDialogHeader><AlertDialogTitle>{ask?.title}</AlertDialogTitle><AlertDialogDescription>{ask?.description} Demo action — no live backend update.</AlertDialogDescription></AlertDialogHeader>
    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { ask?.onConfirm(); setAsk(null); }}>{ask?.confirm}</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
  return [setAsk, dialog] as const;
}
