import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useInView } from "motion/react";
import { useRef } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { countByType, eventLabels, useLocalEvents, type AnalyticsEventType, type SeriesPoint } from "@/lib/analytics";

export function DemoLabel({ children = "Demo analytics — illustrative numbers, not platform statistics." }: { children?: ReactNode }) {
  return <p className="demo-label" role="note"><span>DEMO</span>{children}</p>;
}
export function MetricGrid({ items }: { items: { label: string; value: string | number; hint?: string | undefined }[] }) {
  return <div className="metric-grid">{items.map(m => <div className="metric" key={m.label}><span>{m.label}</span><strong>{typeof m.value === "number" ? <CountUp value={m.value}/> : m.value}</strong>{m.hint && <small>{m.hint}</small>}</div>)}</div>;
}
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const reduced = useReducedMotion();
  const [number, setNumber] = useState(value);
  useEffect(() => {
    if (!inView || reduced || value === 0) { setNumber(value); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => { const t = Math.min((now - start) / 550, 1); setNumber(Math.round(value * (1 - (1 - t) ** 3))); if (t < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, inView, reduced]);
  return <motion.span ref={ref} aria-label={value.toLocaleString("en-IN")} className="metric-number">{number.toLocaleString("en-IN")}</motion.span>;
}
const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
export function TrendCard({ title, data, kind = "area" }: { title: string; data: SeriesPoint[]; kind?: "area" | "bar" }) {
  const empty = data.every(p => p.value === 0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <figure className="chart-card"><figcaption>{title}</figcaption><div className="chart-box chart-loading" aria-busy="true"/></figure>;
  return <figure className="chart-card"><figcaption>{title}</figcaption>
    {empty ? <p className="chart-empty">No analytics yet.</p> : <div className="chart-box" role="img" aria-label={`${title} chart, ${data.length} points`}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "area" ? <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs><linearGradient id={`g-${title.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22}/><stop offset="100%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd"/><YAxis tick={axis} tickLine={false} axisLine={false} width={44} allowDecimals={false}/>
          <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}/>
          <Area type="monotone" dataKey="value" name={title} stroke="var(--primary)" strokeWidth={2} fill={`url(#g-${title.replace(/\W/g, "")})`}/>
        </AreaChart> : <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd"/><YAxis tick={axis} tickLine={false} axisLine={false} width={44} allowDecimals={false}/>
          <Tooltip cursor={{ fill: "var(--secondary)" }} contentStyle={{ borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}/>
          <Bar dataKey="value" name={title} fill="var(--primary)" radius={[3, 3, 0, 0]}/>
        </BarChart>}
      </ResponsiveContainer></div>}
  </figure>;
}
/** Real events recorded on this device by the analytics seam. */
export function LocalEventsCard({ types }: { types: AnalyticsEventType[] }) {
  const { data } = useLocalEvents();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const counts = countByType(data.events);
  return <section className="local-events"><h3>Recorded on this device</h3><p>Real interactions from this browser, counted locally until server analytics exist.</p>
    {!ready ? <p className="chart-empty">Loading…</p> : <dl>{types.map(t => <div key={t}><dt>{eventLabels[t]}</dt><dd>{counts[t]}</dd></div>)}</dl>}
  </section>;
}
