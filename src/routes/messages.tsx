import { guardArea } from "@/lib/auth/route-guard";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { ChatPanel } from "@/components/engagement";

export const Route = createFileRoute("/messages")({
  beforeLoad: guardArea("dashboard"),
  head: () => ({ meta: [
    { title: "Messages — HouseProvider.in" },
    { name: "description", content: "Chat with property seekers and owners about your HouseProvider listings." },
  ] }),
  component: MessagesPage,
});

function MessagesPage() {
  return <main className="dashboard-page messages-page"><div className="wrap">
    <div className="results-intro dash-intro">
      <div><p className="kicker">MESSAGES</p><h1>Your <em>conversations.</em></h1><p className="form-hint">Enquiries start here as conversations. Reply to seekers or owners directly from one inbox.</p></div>
    </div>
    <div className="messages-inbox-head"><div><MessageSquare size={18}/><strong>Live chat inbox</strong></div><span>Private conversations linked to properties</span></div>
    <ChatPanel/>
  </div></main>;
}
