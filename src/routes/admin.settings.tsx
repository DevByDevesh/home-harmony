import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AdminHeader } from "@/components/admin/admin-kit";
import { defaultSettings, notificationChannels, notificationEvents, type PlatformSettings } from "@/lib/admin/config";
import { adminHead } from "@/lib/admin/head";
import { getMaintenanceModeFn, setMaintenanceModeFn } from "@/lib/admin-settings.functions";

export const Route = createFileRoute("/admin/settings")({ head: adminHead("Settings"), component: AdminSettings });
const sections: [keyof PlatformSettings, string][] = [["general", "General"], ["platform", "Platform"], ["listings", "Listings"], ["verification", "Verification"], ["moderation", "Moderation"], ["subscriptions", "Subscriptions"], ["payments", "Payments"], ["featured", "Featured listings"], ["services", "Services"], ["notifications", "Notifications"], ["security", "Security"]];
const human = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

function AdminSettings() {
  const [sec, setSec] = useState<keyof PlatformSettings>("general");
  const [maintenanceMode, setMaintenanceMode] = useState(defaultSettings.platform.maintenanceMode);
  const [loadingMaintenance, setLoadingMaintenance] = useState(true);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  useEffect(() => {
    void getMaintenanceModeFn().then(enabled => setMaintenanceMode(enabled)).finally(() => setLoadingMaintenance(false));
  }, []);

  const platformValue = { ...defaultSettings.platform, maintenanceMode };
  const save = async (value: PlatformSettings[keyof PlatformSettings]) => {
    if (sec !== "platform") return;
    const enabled = Boolean((value as PlatformSettings["platform"]).maintenanceMode);
    setSavingMaintenance(true);
    try {
      const result = await setMaintenanceModeFn({ data: { enabled } });
      if (result.ok) setMaintenanceMode(result.enabled);
    } finally {
      setSavingMaintenance(false);
    }
  };

  return <>
    <AdminHeader title="Settings" intro="Platform configuration is currently defined in code. Database-backed settings are enabled for live maintenance mode."/>
    <p className="admin-note">Maintenance mode is now live and database-backed. Other settings remain read-only until their providers are connected.</p>
    <div className="admin-settings">
      <div className="seg-tabs admin-settings-tabs" role="tablist" aria-label="Settings sections">{sections.map(([k, label]) => <button key={k} role="tab" aria-selected={sec === k} onClick={() => setSec(k)}>{label}</button>)}</div>
      <SectionForm
        key={sec + JSON.stringify(sec === "platform" ? platformValue : defaultSettings[sec])}
        section={sec}
        value={sec === "platform" ? platformValue : defaultSettings[sec]}
        disabled={sec !== "platform" || loadingMaintenance || savingMaintenance}
        onSave={save}
      />
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

