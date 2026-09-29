import { Check, Minus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { MatchResult } from "@/lib/match";

export function MatchBadge({ match }: { match: MatchResult }) {
  return <Popover><PopoverTrigger className="match-badge" aria-label={`${match.score}% match — why?`}>{match.score}% match</PopoverTrigger>
    <PopoverContent className="match-pop" align="end"><p className="kicker">WHY THIS MATCHES YOU</p><ul>{match.reasons.map(r => <li key={r.label} className={r.met ? "met" : "unmet"}>{r.met ? <Check size={14}/> : <Minus size={14}/>}{r.label}</li>)}</ul><small>Based only on the filters and preferences you set.</small></PopoverContent></Popover>;
}
