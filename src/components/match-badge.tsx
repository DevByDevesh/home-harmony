import { Link } from "@tanstack/react-router";
import { AlertTriangle, Check, Minus, SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { explainMatch, MIN_CRITERIA, type MatchOutcome, type MatchResult } from "@/lib/match";

function Reasons({ match }: { match: MatchResult }) {
  return <ul className="match-reasons">
    {match.matched.map(r => <li key={r} className="met"><Check size={14} aria-hidden/><span>{r}</span></li>)}
    {match.warnings.map(r => <li key={r} className="warn"><AlertTriangle size={14} aria-hidden/><span>{r}</span></li>)}
    {match.unmatched.map(r => <li key={r} className="unmet"><Minus size={14} aria-hidden/><span>{r}</span></li>)}
  </ul>;
}

export function MatchBadge({ match }: { match: MatchResult }) {
  return <Popover><PopoverTrigger className="match-badge" aria-label={`${match.score}% match — see why`}>{match.score}% match</PopoverTrigger>
    <PopoverContent className="match-pop" align="end"><p className="kicker">WHY THIS MATCHES YOU</p><p className="match-sum">{explainMatch(match)}</p><Reasons match={match}/><small>Calculated only from the criteria you set and this listing’s own details.</small></PopoverContent></Popover>;
}

/** Full match explanation for the property page, including the "not enough preferences" state. */
export function MatchPanel({ outcome }: { outcome: MatchOutcome }) {
  if (outcome.kind === "insufficient") return <section className="match-panel empty" aria-label="Your match">
    <p className="kicker">YOUR MATCH</p><h3>Set your preferences to see your match.</h3>
    <p>Add {MIN_CRITERIA} or more preferences — like budget, BHK or area — to calculate a match. {outcome.count === 1 ? "You have 1 so far." : ""}</p>
    <Link className="text-link" to="/dashboard" search={{ tab: "preferences" }}><SlidersHorizontal size={15}/> Set preferences</Link>
  </section>;
  const m = outcome.result;
  return <section className="match-panel" aria-label="Your match">
    <div className="match-panel-head"><div><p className="kicker">YOUR MATCH</p><h3><strong>{m.score}%</strong> match</h3></div><span>{explainMatch(m)}</span></div>
    <p className="kicker">WHY THIS MATCHES YOU</p><Reasons match={m}/>
    <small>Based only on your saved preferences and current search. Commute, neighbourhood and safety aren’t scored — that data isn’t available.</small>
  </section>;
}
