import { createFileRoute } from "@tanstack/react-router";

async function handle({ request }: { request: Request }) {
  const { getAuth } = await import("@/lib/auth/auth.server");
  return (await getAuth()).handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: { handlers: { GET: handle, POST: handle } },
});
