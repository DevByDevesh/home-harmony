import { createFileRoute } from "@tanstack/react-router";
import { guardArea } from "@/lib/auth/route-guard";
import { ChatPanel } from "@/components/engagement";

export const Route = createFileRoute("/messages")({
  beforeLoad: guardArea("dashboard"),
  head: () => ({ meta: [
    { title: "Messages — HouseProvider.in" },
    { name: "description", content: "Your HouseProvider conversations." },
  ] }),
  component: MessagesPage,
});

function MessagesPage() {
  return <main className="messages-page">
    <div className="wrap">
      <div className="messages-page-title">
        <h1>Messages</h1>
      </div>
      <ChatPanel/>
    </div>
  </main>;
}
