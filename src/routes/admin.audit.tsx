import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AdminDataTable, AdminDemoNote, AdminHeader, AdminStatusBadge, fmtDateTime } from "@/components/admin/admin-kit";
import { useConfirm } from "@/components/admin/use-confirm";
import { useAdminActions, useAdminData } from "@/lib/admin/repository";
import { adminHead } from "@/lib/admin/head";

export const Route = createFileRoute("/admin/audit")({ head: adminHead("Audit log"), component: AdminAudit });

function AdminAudit() {
  const { data: s, ready } = useAdminData(); const act = useAdminActions(); const [ask, dialog] = useConfirm();
  return <>
    <AdminHeader title="Audit log" intro="Every admin action, including denied attempts. Server-side, this log will be append-only." actions={act.can("settings.edit") && <Button size="sm" variant="outline" onClick={() => ask({ title: "Reset all admin demo data?", description: "Restores the fictional seed records and clears this device's audit entries.", confirm: "Reset", onConfirm: act.reset })}>Reset demo data</Button>}/>
    <AdminDemoNote>Entries are recorded on this device only.</AdminDemoNote>
    <AdminDataTable rows={s.audit} ready={ready} caption="Audit log" emptyTitle="No admin actions recorded yet." rowLabel={a => a.action} pageSize={12}
      search={a => `${a.admin} ${a.action} ${a.target}`}
      filters={[{ key: "result", label: "Result", options: ["SUCCESS", "DENIED"], get: a => a.result }]}
      columns={[
        { key: "at", label: "Timestamp", render: a => <time dateTime={a.at}>{fmtDateTime(a.at)}</time>, sort: a => a.at },
        { key: "admin", label: "Admin", render: a => a.admin, sort: a => a.admin },
        { key: "action", label: "Action", render: a => a.action, sort: a => a.action },
        { key: "target", label: "Target", render: a => a.target },
        { key: "result", label: "Result", render: a => <AdminStatusBadge status={a.result}/> },
      ]}/>
    {dialog}
  </>;
}
