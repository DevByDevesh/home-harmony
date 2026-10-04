import { useMemo, useState } from "react";
import { Bot, ChevronDown, MessageCircle, Send, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Message = { id: number; from: "bot" | "user"; text: string };

const QUICK = [
  "I can't sign in",
  "I can't post a property",
  "My listing is under review",
  "I can't save a property",
  "I found a suspicious listing",
  "How do I contact an owner?",
];

const ANSWERS: Array<{ test: RegExp; text: string }> = [
  { test: /suspicious|fake|scam|fraud|report/i, text: "Don't send money or payment details to a property contact just because they ask. Use the property/report controls when available and avoid moving a transaction off-platform until the listing and owner are verified." },
  { test: /review|approval|approve|under review|pending/i, text: "Under Review means HouseProvider's automatic safety checks found something that needs attention, or the listing is incomplete. It is not visible as a live listing until the checks pass." },
  { test: /contact|owner|message|enquir/i, text: "Open a live property's detail page and use “Message Owner” / “Send an enquiry”. Your conversation stays connected to that property so you can continue from your dashboard." },
  { test: /sign|login|log in|password|google/i, text: "Try signing in again and make sure your email/password are correct. If you use Google, use “Continue with Google”. If the account is suspended or deactivated, the message on screen will tell you what to do." },
  { test: /\bpost\b|\badd\b.*\bproperty\b|\bcreate\b.*\blisting\b|list your property/i, text: "You can post a property from “List your property”. A normal HouseProvider account can also post its own listings. Complete the details and photos, then submit — the listing is automatically checked before it goes live." },
  { test: /save|saved|favourite|favorite/i, text: "Open a live property and tap the heart icon to save it. You need to be signed in for your saved homes to stay with your account." },
  { test: /compare/i, text: "Use Compare on property cards to add homes and review them side by side. HouseProvider supports up to four properties in a comparison." },
  { test: /visit|schedule/i, text: "Open a live property and choose the visit option to request a viewing. Only live homes can be used for visit requests." },
  { test: /photo|image|upload/i, text: "For a listing, upload clear property photos in the Photos step. The first photo is used as the cover. If an upload fails, check the file type/size and try again." },
];

function answerFor(input: string) {
  const hit = ANSWERS.find(({ test }) => test.test(input));
  return hit?.text ?? "I can help with sign-in, posting a property, listing review, saved homes, enquiries, visits, comparisons, photos, and suspicious listings. Try one of the quick questions below, or describe your problem in your own words.";
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: "bot", text: "Hi! I'm HouseProvider Help. Tell me what went wrong and I'll give you an instant solution." },
  ]);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const suggestions = useMemo(() => QUICK.filter(q => !messages.some(m => m.from === "user" && m.text === q)).slice(0, 3), [messages]);

  const send = (text = input) => {
    const value = text.trim();
    if (!value) return;
    setMessages(prev => [...prev, { id: Date.now(), from: "user", text: value }, { id: Date.now() + 1, from: "bot", text: answerFor(value) }]);
    setInput("");
    setFeedback(null);
  };

  return <>
    {open && <section className="support-chat" aria-label="HouseProvider Help">
      <div className="support-chat-head">
        <div className="support-chat-title"><span className="support-bot-icon"><Bot size={17}/></span><div><strong>HouseProvider Help</strong><small>Quick help &amp; feedback</small></div></div>
        <button type="button" className="support-close" onClick={() => setOpen(false)} aria-label="Close help"><X size={18}/></button>
      </div>
      <div className="support-chat-body">
        <div className="support-messages">
          {messages.map(message => <div key={message.id} className={`support-message ${message.from}`}>{message.text}</div>)}
        </div>
        {suggestions.length > 0 && <div className="support-suggestions">{suggestions.map(q => <button type="button" key={q} onClick={() => send(q)}>{q}</button>)}</div>}
        <div className="support-feedback">
          <span>Was this helpful?</span>
          <button type="button" aria-label="Helpful" className={feedback === "up" ? "selected" : ""} onClick={() => setFeedback("up")}><ThumbsUp size={14}/></button>
          <button type="button" aria-label="Not helpful" className={feedback === "down" ? "selected" : ""} onClick={() => setFeedback("down")}><ThumbsDown size={14}/></button>
          <a href="mailto:support@houseprovider.in?subject=HouseProvider%20support%20feedback">Report a problem</a>
        </div>
      </div>
      <form className="support-chat-input" onSubmit={e => { e.preventDefault(); send(); }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Describe your problem…" aria-label="Describe your problem"/>
        <Button type="submit" size="icon" aria-label="Send"><Send size={16}/></Button>
      </form>
    </section>}
    <button type="button" className={`support-fab ${open ? "open" : ""}`} onClick={() => setOpen(v => !v)} aria-label={open ? "Close HouseProvider Help" : "Open HouseProvider Help"}>
      {open ? <ChevronDown size={21}/> : <><MessageCircle size={21}/><span>Help</span></>}
    </button>
  </>;
}
