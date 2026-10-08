import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminHeader, AdminDataTable, AdminStatusBadge } from "@/components/admin/admin-kit";
import { adminHead } from "@/lib/admin/head";
import { createPromotionFn, listPromotionsFn, stopPromotionFn } from "@/lib/promotion.functions";

export const Route = createFileRoute("/admin/featured")({ head: adminHead("Featured & Boost"), component: Promotions });

function Promotions() {
  const qc=useQueryClient(); const q=useQuery({queryKey:["admin","promotions"],queryFn:()=>listPromotionsFn()});
  const [propertyId,setPropertyId]=useState(""); const [type,setType]=useState<"FEATURED"|"BOOST">("FEATURED"); const [days,setDays]=useState("7"); const [busy,setBusy]=useState(false);
  const create=async()=>{setBusy(true);try{const r=await createPromotionFn({data:{propertyId:propertyId.trim(),promotionType:type,days:Number(days)}});if(!r.ok){alert(r.message);return}setPropertyId("");await qc.invalidateQueries({queryKey:["admin","promotions"]});}finally{setBusy(false)}};
  const stop=async(id:string)=>{const r=await stopPromotionFn({data:{id}});if(!r.ok){alert(r.message);return}await qc.invalidateQueries({queryKey:["admin","promotions"]})};
  return <><AdminHeader title="Featured & Boost" intro="Promote approved, photo-backed listings. Promotions are clearly labelled and time-bound."/>
    <section className="profile-card" style={{display:"grid",gap:12,gridTemplateColumns:"2fr 1fr 1fr auto",alignItems:"end"}}>
      <label>Property ID<input value={propertyId} onChange={e=>setPropertyId(e.target.value)} placeholder="Paste listing ID"/></label>
      <label>Promotion<select value={type} onChange={e=>setType(e.target.value as "FEATURED"|"BOOST")}><option value="FEATURED">Featured</option><option value="BOOST">Boost</option></select></label>
      <label>Days<input type="number" min="1" max="30" value={days} onChange={e=>setDays(e.target.value)}/></label>
      <Button disabled={busy||propertyId.length<8} onClick={create}>Promote</Button>
    </section>
    <AdminDataTable rows={q.data??[]} ready={!q.isPending} caption="Promotions" emptyTitle="No promotions yet." rowLabel={x=>x.title}
      columns={[
        {key:"title",label:"Listing",render:x=><span>{x.title}<small style={{display:"block"}}>{x.city} · {x.slug}</small></span>,sort:x=>x.title},
        {key:"type",label:"Type",render:x=><AdminStatusBadge status={x.promotionType}/>,sort:x=>x.promotionType},
        {key:"active",label:"Status",render:x=><AdminStatusBadge status={x.active?"ACTIVE":"ENDED"}/>,sort:x=>String(x.active)},
        {key:"ends",label:"Ends",render:x=>new Date(x.endsAt).toLocaleString("en-IN"),sort:x=>x.endsAt},
        {key:"action",label:"",render:x=>x.active?<Button size="sm" variant="outline" onClick={()=>void stop(x.id)}>Stop</Button>:null},
      ]}/>
  </>;
}
