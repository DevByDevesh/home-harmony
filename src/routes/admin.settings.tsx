import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AdminHeader, AdminLoadingState } from "@/components/admin/admin-kit";
import { useAdminActions, useAdminData } from "@/lib/admin/repository";
import { adminHead } from "@/lib/admin/head";
import { notificationChannels, notificationEvents, type PlatformSettings } from "@/lib/admin/config";

export const Route = createFileRoute("/admin/settings")({ head: adminHead("Settings"), component: AdminSettings });
const sections: [keyof PlatformSettings, string][] = [["general", "General"], ["platform", "Platform"], ["listings", "Listings"], ["verification", "Verification"], ["moderation", "Moderation"], ["subscriptions", "Subscriptions"], ["payments", "Payments"], ["featured", "Featured listings"], ["services", "Services"], ["notifications", "Notifications"], ["security", "Security"]];
const human = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

function AdminSettings() {
  const { data: s, ready } = useAdminData(); const act = useAdminActions();
  const [sec, setSec] = useState<keyof PlatformSettings>("general");
  const editable = act.can("settings.edit");
  return <>
    <AdminHeader title="Settings" intro="Platform rules live in one configuration object so a backend can own them later."/>
    <p className="admin-note">Payment and notification providers are not connected. No provider credentials are stored here.</p>
    <div className="admin-settings">
      <div className="seg-tabs admin-settings-tabs" role="tablist" aria-label="Settings sections">{sections.map(([k, label]) => <button key={k} role="tab" aria-selected={sec === k} onClick={() => setSec(k)}>{label}</button>)}</div>
      {!ready ? <AdminLoadingState/> : <SectionForm key={sec + JSON.stringify(s.settings[sec])} section={sec} value={s.settings[sec]} disabled={!editable} onSave={v => act.saveSettings(sec, v)}/>}
    </div>
  </>;
}

function SectionForm({ section, value, disabled, onSave }: { section: keyof PlatformSettings; value: PlatformSettings[keyof PlatformSettings]; disabled: boolean; onSave: (v: PlatformSettings[keyof PlatformSettings]) => void }) {
  const [v, setV] = useState<Record<string, unknown>>(value as Record<string, unknown>);
  if (section === "notifications") {
    const n = v as PlatformSettings["notifications"];
    return <form className="admin-form" onSubmit={e => { e.preventDefault(); onSave(n); }}>
      <p className="form-hint">Only in-app notifications can work without a provider. Email, SMS and push need a connected service.</p>
      <div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">Notification channels per event</caption><thead><tr><th scope="col">Event</th>{notificationChannels.map(c => <th key={c} scope="col">{c.replace("_", "-").toLowerCase()}</th>)}</tr></thead>
        <tbody>{notificationEvents.map(ev => <tr key={ev.key}><th scope="row">{ev.label}</th>{notificationChannels.map(c => <td key={c}><input type="checkbox" aria-label={`${ev.label} via ${c}`} disabled={disabled} checked={n[ev.key].includes(c)} onChange={e => setV({ ...n, [ev.key]: e.target.checked ? [...n[ev.key], c] : n[ev.key].filter(x => x !== c) })}/></td>)}</tr>)}</tbody></table></div>
      <Button type="submit" disabled={disabled}>Save notifications</Button></form>;
  }
  return <form className="admin-form" onSubmit={e => { e.preventDefault(); onSave(v as PlatformSettings[keyof PlatformSettings]); }}>
    {Object.entries(v).map(([k, val]) => {
      const id = `set-${section}-${k}`;
      if (typeof val === "boolean") return <label key={k} className="admin-check"><Switch id={id} checked={val} disabled={disabled} onCheckedChange={c => setV({ ...v, [k]: c })}/> {human(k)}</label>;
      if (Array.isArray(val)) return <label key={k} className="admin-field" htmlFor={id}><span>{human(k)} (one per line)</span><textarea id={id} rows={5} disabled={disabled} value={val.join("\n")} onChange={e => setV({ ...v, [k]: e.target.value.split("\n") })}/></label>;
      if (k === "provider") return <label key={k} className="admin-field" htmlFor={id}><span>Payment provider</span><select id={id} disabled={disabled} value={String(val)} onChange={e => setV({ ...v, [k]: e.target.value })}><option value="demo">Not connected</option><option value="razorpay">Razorpay — requires server setup</option><option value="stripe">Stripe — requires server setup</option></select><small>Selecting a provider here doesn't connect it; credentials must be added server-side.</small></label>;
      return <label key={k} className="admin-field" htmlFor={id}><span>{human(k)}</span><input id={id} disabled={disabled || k === "currency"} type={typeof val === "number" ? "number" : "text"} min={0} value={String(val)} onChange={e => setV({ ...v, [k]: typeof val === "number" ? Math.max(0, Number(e.target.value)) : e.target.value })}/></label>;
    })}
    <Button type="submit" disabled={disabled}>Save {human(section).toLowerCase()} settings</Button></form>;
}

