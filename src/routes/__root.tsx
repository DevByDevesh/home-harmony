import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, useRouterState, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import appCss from "../styles.css?url";
import modernUiCss from "../modern-ui.css?url";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { CompareTray } from "@/components/compare-tray";
import { PageEntrance } from "@/components/cinematic-motion";
import { SupportChat } from "@/components/support-chat";
import { getMaintenanceModeFn } from "@/lib/admin-settings.functions";
import { getCurrentUser } from "@/lib/auth/auth.functions";
import { SUPPORT_EMAIL } from "@/lib/support";

function NotFoundPage() { return <main className="fallback wrap"><p className="kicker">NOT FOUND</p><h1>That place isn’t here.</h1><p>The page may have moved, but there are more homes to explore.</p><Button asChild><Link to="/properties">Explore homes</Link></Button></main>; }
function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return <main className="fallback wrap"><p className="kicker">SOMETHING WENT WRONG</p><h1>This page didn’t load.</h1><p>Try again or return to the home page.</p><div className="fallback-actions"><Button onClick={() => { router.invalidate(); reset(); }}>Try again</Button><Button asChild variant="outline"><Link to="/">Go home</Link></Button></div></main>;
}
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({ meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }], links: [
    { rel: "stylesheet", href: appCss }, { rel: "stylesheet", href: modernUiCss }, { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }, { rel: "manifest", href: "/manifest.webmanifest" },
    { rel: "preconnect", href: "https://fonts.googleapis.com" }, { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" }
  ] }),
  shellComponent: RootShell, component: RootApp, notFoundComponent: NotFoundPage, errorComponent: ErrorPage,
});
function RootShell({ children }: { children: ReactNode }) { return <html lang="en"><head><HeadContent/></head><body>{children}<Scripts/></body></html>; }
function MaintenancePage() {
  return <main className="fallback wrap">
    <p className="kicker">HOUSEPROVIDER</p>
    <h1>We’ll be back shortly.</h1>
    <p>HouseProvider is temporarily unavailable while we perform maintenance. Please check back in a little while.</p>
  </main>;
}

function RootApp() {
  useEffect(() => { if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, []);
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([getMaintenanceModeFn(), getCurrentUser()]).then(([enabled, user]) => {
      if (!active) return;
      const adminArea = pathname.startsWith("/admin");
      const publicAuthArea = pathname === "/login" || pathname === "/signup" || pathname.startsWith("/auth/");
      setMaintenance(enabled && !adminArea && !publicAuthArea && user?.role !== "ADMIN");
    }).catch(() => {
      if (active) setMaintenance(false);
    });
    return () => { active = false; };
  }, [pathname]);

  if (maintenance) return <MaintenancePage />;

  const isAdminArea = pathname.startsWith("/admin");

  return <QueryClientProvider client={queryClient}>
    {isAdminArea ? (
      <PageEntrance pageKey={pathname}><Outlet/></PageEntrance>
    ) : (
      <>
        <Navigation/>
        <PageEntrance pageKey={pathname}><Outlet/></PageEntrance>
        <CompareTray/>
        <SupportChat/>
        <footer className="footer">
          <div className="wrap footer-main">
            <div className="footer-brand">
              <Link to="/" className="footer-logo"><span className="footer-mark">h</span><span>houseprovider<span className="footer-domain">.in</span></span></Link>
              <p>Good places. New beginnings.</p>
              <p className="footer-brand-note">Find a home that fits the way you want to live.</p>
            </div>
            <nav className="footer-links" aria-label="Explore">
              <h2>Explore</h2>
              <Link to="/properties">Find a home</Link>
              <Link to="/saved">Saved homes</Link>
              <Link to="/compare">Compare homes</Link>
            </nav>
            <nav className="footer-links" aria-label="Your account">
              <h2>Your account</h2>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/account">Account settings</Link>
              <Link to="/list-property">List a property</Link>
            </nav>
            <div className="footer-contact">
              <h2>Need a hand?</h2>
              <p>For account, listing, payment, or technical support, our customer care team is here to help.</p>
              <Link to="/support" className="footer-support-link">Visit customer support <span aria-hidden="true">↗</span></Link>
              <a className="footer-email" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </div>
          </div>
          <div className="wrap footer-note">
            <span>© HouseProvider.in</span>
            <span>Property information, pricing and availability are subject to owner confirmation.</span>
          </div>
        </footer>
      </>
    )}
    <Toaster position="top-center"/>
  </QueryClientProvider>;
}