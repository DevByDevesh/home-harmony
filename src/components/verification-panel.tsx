import { Check, CircleDashed, Clock, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isFullyVerified, stateLabel, verificationItems, verifiedCount, type VerificationKey, type VerificationRecord, type VerificationState } from "@/lib/verification";

const icon: Record<VerificationState, typeof Check> = { VERIFIED: Check, PENDING: Clock, REJECTED: X, EXPIRED: RotateCcw, NOT_REQUESTED: CircleDashed };
/** Renders only real state. A check reads "Verified" solely when its state is VERIFIED. */
export function VerificationPanel({ record, onRequest, compact }: { record: VerificationRecord; onRequest?: ((keys: VerificationKey[]) => void) | undefined; compact?: boolean }) {
  const requestable = verificationItems.filter(i => ["NOT_REQUESTED", "REJECTED", "EXPIRED"].includes(record[i.key].state)).map(i => i.key);
  return <section className={`verify-panel${compact ? " compact" : ""}`} aria-label="HouseProvider verification">
    <header><div><p className="kicker">HOUSEPROVIDER VERIFICATION</p><strong>{isFullyVerified(record) ? "HouseProvider Verified" : `${verifiedCount(record)} of ${verificationItems.length} checks verified`}</strong></div>
      {onRequest && requestable.length > 0 && <Button size="sm" variant="outline" onClick={() => onRequest(requestable)}>Request checks</Button>}</header>
    <ul>{verificationItems.map(i => { const s = record[i.key].state; const I = icon[s]; return <li key={i.key} className={`v-${s.toLowerCase()}`}>
      <I size={16} aria-hidden/><div><span>{i.label} <em>{stateLabel[s].toLowerCase()}</em></span>{!compact && <small>{i.how}</small>}</div></li>; })}</ul>
    <p className="verify-note">Checks are performed by HouseProvider moderation once the verification backend is connected. Requesting a check here only marks it pending.</p>
  </section>;
}
