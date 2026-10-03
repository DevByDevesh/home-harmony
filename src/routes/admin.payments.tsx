import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminDataTable, AdminDetailPanel, AdminHeader, AdminMetricCard, AdminStatusBadge, DetailList, fmtDate, fmtDateTime } from "@/components/admin/admin-kit";
import { useConfirm } from "@/components/admin/use-confirm";
import { lookups, useAdminActions, useAdminData } from "@/lib/admin/repository";
import { LivePaymentsPanel } from "@/components/admin/live-business";
import { adminHead } from "@/lib/admin/head";
import { getPaymentProvider, providerLabels } from "@/lib/payments/provider";
import { inr } from "@/lib/catalog";

export const Route = createFileRoute("/admin/payments")({ head: adminHead("Payments"), component: AdminPayments });

function AdminPayments() {
  const { data: s, ready } = useAdminData(); const act = useAdminActions(); const l = lookups(s);
  const [ask, dialog] = useConfirm(); const [open, setOpen] = useState<string | null>(null); const [invoice, setInvoice] = useState(false);
  const provider = getPaymentProvider();
  const cur = s.payments.find(p => p.id === open); const inv = cur && s.invoices.find(i => i.id === cur.invoiceId);
  const sum = (st: string) => s.payments.filter(p => p.status === st).reduce((n, p) => n + p.amount, 0);
  return <>
    <AdminHeader title="Payments" intro={`Gateway: ${provider.label}. No real money moves in this environment.`}/>
    <LivePaymentsPanel canRefund={act.can("payments.refund")}/>
    <p className="admin-note">Payment gateway integration is not connected. These records are for payment workflow testing only.</p>
    <AdminMetricCard items={[{ label: "Succeeded", value: inr(sum("SUCCEEDED")) }, { label: "Refunded", value: inr(sum("REFUNDED")) }, { label: "Failed transactions", value: s.payments.filter(p => p.status === "FAILED").length }]}/>
    <AdminDataTable rows={s.payments} ready={ready} caption="Transactions" emptyTitle="No transactions found." rowLabel={p => p.id} onOpen={p => { setOpen(p.id); setInvoice(false); }}
      search={p => `${p.id} ${l.userName(p.userId)} ${p.product}`}
      filters={[{ key: "status", label: "Status", options: ["PENDING", "PROCESSING", "SUCCEEDED", "FAILED", "REFUNDED", "CANCELLED"], get: p => p.status }]}
      columns={[
        { key: "id", label: "Transaction", render: p => <code>{p.id}</code>, sort: p => p.id },
        { key: "user", label: "User", render: p => l.userName(p.userId) },
        { key: "product", label: "Product / service", render: p => p.product },
        { key: "amount", label: "Amount", render: p => `${inr(p.amount)} ${p.currency}`, sort: p => p.amount },
        { key: "status", label: "Status", render: p => <AdminStatusBadge status={p.status}/>, sort: p => p.status },
        { key: "provider", label: "Provider", render: p => providerLabels[p.provider] },
        { key: "date", label: "Date", render: p => fmtDate(p.createdAt), sort: p => p.createdAt },
        { key: "invoice", label: "Invoice", render: p => s.invoices.find(i => i.id === p.invoiceId)?.number ?? "—" },
      ]}/>
    {cur && <AdminDetailPanel open onOpenChange={o => !o && setOpen(null)} title={cur.id} description="Payment record � gateway not connected.">
      {!invoice ? <>
        <DetailList items={[["User", l.userName(cur.userId)], ["Product", cur.product], ["Amount", `${inr(cur.amount)} ${cur.currency}`], ["Status", <AdminStatusBadge key="s" status={cur.status}/>], ["Method", cur.method.label], ["Provider", providerLabels[cur.provider]], ["Created", fmtDateTime(cur.createdAt)], ["Refund", cur.refundRequested ? "Requested" : "—"]]}/>
        <div className="admin-sheet-actions"><Button size="sm" variant="outline" onClick={() => setInvoice(true)}>View invoice</Button>
          {cur.status === "SUCCEEDED" && !cur.refundRequested && <Button size="sm" disabled={!act.can("payments.refund")} onClick={() => ask({ title: "Request refund?", description: `A refund of ${inr(cur.amount)} would be sent to the payment provider. No provider is connected, so the request is recorded internally only.`, confirm: "Request refund", onConfirm: () => act.requestRefund(cur.id, cur.amount) })}>Request refund</Button>}</div>
        {!act.can("payments.refund") && <p className="form-hint">Refunds require a Super admin.</p>}
      </> : inv && <div className="admin-invoice" aria-label="Invoice">
        <p className="kicker">INVOICE PREVIEW � NOT A TAX DOCUMENT</p><h3>{inv.number}</h3><p>Issued {fmtDate(inv.issuedAt)} to {l.userName(cur.userId)}</p>
        <table className="admin-table"><caption className="sr-only">Invoice lines</caption><tbody>{inv.lines.map(li => <tr key={li.label}><th scope="row">{li.label}</th><td>{inr(li.amount)}</td></tr>)}<tr><th scope="row">GST</th><td>{inr(inv.tax)}</td></tr><tr><th scope="row">Total</th><td><strong>{inr(cur.amount)}</strong></td></tr></tbody></table>
        <Button size="sm" variant="outline" onClick={() => setInvoice(false)}>Back to payment</Button></div>}
    </AdminDetailPanel>}
    {dialog}
  </>;
}


