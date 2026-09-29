import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Home, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: state => state.location.pathname });
  return <>
    <header className={`navigation ${path === "/" ? "navigation-home" : ""}`}><div className="wrap navigation-inner">
      <Link to="/" className="wordmark" aria-label="HouseProvider home"><span className="wordmark-symbol">h<span>·</span></span><span>houseprovider<span className="wordmark-domain">.in</span></span></Link>
      <nav className="nav-links" aria-label="Main navigation"><Link to="/properties" search={{ mode: "Rent" }}>Rent</Link><Link to="/properties" search={{ mode: "Buy" }}>Buy</Link><Link to="/properties">Explore homes</Link></nav>
      <div className="nav-actions"><Button asChild variant="outline" className="nav-owner"><Link to="/list-property">List your property <ArrowUpRight size={16}/></Link></Button><Button variant="ghost" size="icon" className="menu-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</Button></div>
    </div></header>
    {open && <nav className="mobile-menu" aria-label="Mobile menu" onClick={() => setOpen(false)}><Link to="/">Home</Link><Link to="/properties" search={{ mode: "Rent" }}>Rent a home</Link><Link to="/properties" search={{ mode: "Buy" }}>Buy a home</Link><Link to="/properties">Explore homes</Link><Link to="/list-property">List your property</Link></nav>}
    <nav className="bottom-nav" aria-label="Mobile navigation"><Link to="/"><Home size={20}/><span>Home</span></Link><Link to="/properties"><Search size={20}/><span>Search</span></Link><Link to="/list-property"><ArrowUpRight size={20}/><span>List</span></Link></nav>
  </>;
}
