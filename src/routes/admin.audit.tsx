import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminDataTable, AdminHeader, AdminStatusBadge, fmtDateTime } from "@/components/admin/admin-kit";
import { adminListAuditFn } from "@/lib/admin-trust.functions";
import { adminHead } from "@/lib/admin/head";

export const Route = createFileRoute("/admin/audit")({ head: adminHead("Audit log"), component: AdminAudit });

function AdminAudit() {
  const q = useQuery({ queryKey: ["admin", "audit"], queryFn: () => adminListAuditFn() });
  const rows = q.data ?? [];
  return <>
    <AdminHeader title="Audit log" intro="The most recent 200 authorized actions recorded by the server, including denied attempts. The log is append-only."/>
    {q.isError && <p role="alert">{(q.error as Error).message}</p>}
    <AdminDataTable rows={rows} ready={!q.isPending} caption="Audit log" emptyTitle="No actions recorded yet." rowLabel={a => a.action} pageSize={12}
      search={a => `${a.actor} ${a.action} ${a.entityType} ${a.entityId}`}
      filters={[{ key: "result", label: "Result", options: ["SUCCESS", "DENIED"], get: a => a.result }, { key: "entity", label: "Entity", options: [...new Set(rows.map(a => a.entityType))], get: a => a.entityType }]}
      columns={[
        { key: "at", label: "Timestamp", render: a => <time dateTime={a.at}>{fmtDateTime(a.at)}</time>, sort: a => a.at },
        { key: "actor", label: "Actor", render: a => a.actor, sort: a => a.actor },
        { key: "action", label: "Action", render: a => a.action, sort: a => a.action },
        { key: "target", label: "Target", render: a => `${a.entityType}${a.entityId ? ` · ${a.entityId}` : ""}`, sort: a => a.entityType },
        { key: "result", label: "Result", render: a => <AdminStatusBadge status={a.result}/> },
      ]}/>
  </>;
}


