import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const home = pathname === "/";
  return <>
    <header className={`site-header ${home ? "site-header-home" : ""}`}>
      <div className="site-header-inner">
        <Link to="/" className="brand" aria-label="HouseProvider home"><span className="brand-mark">H<span>.</span></span><span>houseprovider<span className="brand-domain">.in</span></span></Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link to="/properties" search={{ intent: "Rent" }} activeProps={{ className: "nav-active" }}>Rent</Link>
          <Link to="/properties" search={{ intent: "Buy" }} activeProps={{ className: "nav-active" }}>Buy</Link>
          <Link to="/properties">Explore homes</Link>
        </nav>
        <div className="header-actions"><Link to="/properties" className="header-search" aria-label="Search properties"><Search size={19} /></Link><Button asChild className="header-cta"><Link to="/properties">Explore homes <ArrowUpRight size={16}/></Link></Button><Button variant="ghost" size="icon" className="mobile-menu-trigger" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</Button></div>
      </div>
    </header>
    {open && <nav className="mobile-menu" aria-label="Mobile navigation" onClick={() => setOpen(false)}><Link to="/">Home</Link><Link to="/properties" search={{ intent: "Rent" }}>Rent a home</Link><Link to="/properties" search={{ intent: "Buy" }}>Buy a home</Link><Link to="/properties">Explore all homes</Link></nav>}
  </>;
}