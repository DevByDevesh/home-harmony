import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Heart, Home, Map, Menu, Search, User, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUserData } from "@/lib/user-data";

export function Navigation() {
  const [open, setOpen] = useState(false);
  const { path, view } = useRouterState({ select: s => ({ path: s.location.pathname, view: (s.location.search as { view?: string }).view }) });
  const { data } = useUserData();
  const onMap = path === "/properties" && (view === "map" || view === "satellite");
  return <>
    <header className={`navigation ${path === "/" ? "navigation-home" : ""}`}><div className="wrap navigation-inner">
      <Link to="/" className="wordmark" aria-label="HouseProvider home"><span className="wordmark-symbol">h<span>·</span></span><span>houseprovider<span className="wordmark-domain">.in</span></span></Link>
      <nav className="nav-links" aria-label="Main navigation"><Link to="/properties" search={{ mode: "Rent" }}>Rent</Link><Link to="/properties" search={{ mode: "Buy" }}>Buy</Link><Link to="/properties" search={{ view: "map" }}>Map</Link><Link to="/compare">Compare</Link></nav>
      <div className="nav-actions">
        <Link to="/saved" className="nav-icon" aria-label={`Saved properties (${data.saved.length})`}><Heart size={18}/>{data.saved.length > 0 && <span className="nav-dot">{data.saved.length}</span>}</Link>
        <Link to="/dashboard" className="nav-icon" aria-label="Dashboard"><User size={18}/></Link>
        <Button asChild variant="outline" className="nav-owner"><Link to="/list-property">List your property <ArrowUpRight size={16}/></Link></Button>
        <Button variant="ghost" size="icon" className="menu-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</Button>
      </div>
    </div></header>
    {open && <nav className="mobile-menu" aria-label="Mobile menu" onClick={() => setOpen(false)}><Link to="/">Home</Link><Link to="/properties" search={{ mode: "Rent" }}>Rent a home</Link><Link to="/properties" search={{ mode: "Buy" }}>Buy a home</Link><Link to="/compare">Compare</Link><Link to="/dashboard">Dashboard</Link><Link to="/owner">Owner dashboard</Link><Link to="/agent">Agent CRM</Link><Link to="/list-property">List your property</Link></nav>}
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <Link to="/" aria-current={path === "/" ? "page" : undefined}><Home size={20}/><span>Home</span></Link>
      <Link to="/properties" aria-current={path === "/properties" && !onMap ? "page" : undefined} activeOptions={{ exact: true }}><Search size={20}/><span>Search</span></Link>
      <Link to="/properties" search={{ view: "map" }} aria-current={onMap ? "page" : undefined}><Map size={20}/><span>Map</span></Link>
      <Link to="/saved" aria-current={path === "/saved" ? "page" : undefined}><Heart size={20}/><span>Saved</span></Link>
      <Link to="/dashboard" aria-current={path === "/dashboard" ? "page" : undefined}><User size={20}/><span>Profile</span></Link>
    </nav>
    <Link to="/list-property" className="post-fab">Post property</Link>
  </>;
}
