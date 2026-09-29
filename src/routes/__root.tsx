import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { CompareTray } from "@/components/compare-tray";

function NotFoundPage() { return <main className="fallback wrap"><p className="kicker">NOT FOUND</p><h1>That place isn’t here.</h1><p>The page may have moved, but there are more homes to explore.</p><Button asChild><Link to="/properties">Explore homes</Link></Button></main>; }
function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return <main className="fallback wrap"><p className="kicker">SOMETHING WENT WRONG</p><h1>This page didn’t load.</h1><p>Try again or return to the home page.</p><div className="fallback-actions"><Button onClick={() => { router.invalidate(); reset(); }}>Try again</Button><Button asChild variant="outline"><Link to="/">Go home</Link></Button></div></main>;
}
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({ meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }], links: [
    { rel: "stylesheet", href: appCss }, { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    { rel: "preconnect", href: "https://fonts.googleapis.com" }, { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" }
  ] }),
  shellComponent: RootShell, component: RootApp, notFoundComponent: NotFoundPage, errorComponent: ErrorPage,
});
function RootShell({ children }: { children: ReactNode }) { return <html lang="en"><head><HeadContent/></head><body>{children}<Scripts/></body></html>; }
function RootApp() {
  const { queryClient } = Route.useRouteContext();
  return <QueryClientProvider client={queryClient}><Navigation/><Outlet/><CompareTray/><Toaster position="top-center"/><footer className="footer"><div className="wrap footer-main"><div><Link to="/" className="footer-logo">houseprovider<span>.in</span></Link><p>Good places. New beginnings.</p></div><nav aria-label="Footer navigation"><Link to="/properties">Explore homes</Link><Link to="/saved">Saved</Link><Link to="/compare">Compare</Link><Link to="/dashboard">Dashboard</Link><Link to="/owner">For owners</Link><Link to="/agent">For agents</Link><Link to="/list-property">For property owners</Link></nav></div><div className="wrap footer-note"><span>© HouseProvider.in</span><span>All properties shown are fictional examples. No listing is verified or available for enquiry.</span></div></footer></QueryClientProvider>;
}
