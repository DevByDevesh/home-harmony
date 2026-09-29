import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Heart, Home, Map, Menu, Search, User, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUserData } from "@/lib/user-data";
import { useCurrentUser, useSignOut } from "@/lib/auth/use-current-user";
import { AREA_ROLES, roleLabel } from "@/lib/auth/roles";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Navigation() {
  const [open, setOpen] = useState(false);
  const { path, view } = useRouterState({ select: s => ({ path: s.location.pathname, view: (s.location.search as { view?: string }).view }) });
  const { data } = useUserData();
  const { user } = useCurrentUser(); const signOut = useSignOut();
  const canOwner = !!user && AREA_ROLES.owner.includes(user.role), canAgent = !!user && AREA_ROLES.agent.includes(user.role), canAdmin = !!user && AREA_ROLES.admin.includes(user.role);
  const onMap = path === "/properties" && (view === "map" || view === "satellite");
  return <>
    <header className={`navigation ${path === "/" ? "navigation-home" : ""}`}><div className="wrap navigation-inner">
      <Link to="/" className="wordmark" aria-label="HouseProvider home"><span className="wordmark-symbol">h<span>·</span></span><span>houseprovider<span className="wordmark-domain">.in</span></span></Link>
      <nav className="nav-links" aria-label="Main navigation"><Link to="/properties" search={{ mode: "Rent" }}>Rent</Link><Link to="/properties" search={{ mode: "Buy" }}>Buy</Link><Link to="/properties" search={{ view: "map" }}>Map</Link><Link to="/compare">Compare</Link></nav>
      <div className="nav-actions">
        <Link to="/saved" className="nav-icon" aria-label={`Saved properties (${data.saved.length})`}><Heart size={18}/>{data.saved.length > 0 && <span className="nav-dot">{data.saved.length}</span>}</Link>
        {user
          ? <DropdownMenu><DropdownMenuTrigger className="nav-icon nav-account" aria-label={`Account menu for ${user.name || user.email}`}><User size={18}/></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="nav-account-menu">
                <DropdownMenuLabel>{user.name || user.email}<small>{roleLabel[user.role]}</small></DropdownMenuLabel><DropdownMenuSeparator/>
                <DropdownMenuItem asChild><Link to="/account">Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/dashboard">Dashboard</Link></DropdownMenuItem>
                {canOwner && <DropdownMenuItem asChild><Link to="/owner">Owner dashboard</Link></DropdownMenuItem>}
                {canAgent && <DropdownMenuItem asChild><Link to="/agent">Agent dashboard</Link></DropdownMenuItem>}
                {canAdmin && <DropdownMenuItem asChild><Link to="/admin">Admin</Link></DropdownMenuItem>}
                <DropdownMenuSeparator/><DropdownMenuItem onSelect={() => { void signOut(); }}>Sign out</DropdownMenuItem>
              </DropdownMenuContent></DropdownMenu>
          : <><Link to="/login" className="nav-auth">Sign in</Link><Link to="/signup" className="nav-auth nav-auth-strong">Create account</Link></>}
        <Button asChild variant="outline" className="nav-owner"><Link to="/list-property">List your property <ArrowUpRight size={16}/></Link></Button>
        <Button variant="ghost" size="icon" className="menu-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</Button>
      </div>
    </div></header>
    {open && <nav className="mobile-menu" aria-label="Mobile menu" onClick={() => setOpen(false)}><Link to="/">Home</Link><Link to="/properties" search={{ mode: "Rent" }}>Rent a home</Link><Link to="/properties" search={{ mode: "Buy" }}>Buy a home</Link><Link to="/compare">Compare</Link><Link to="/list-property">List your property</Link>
      {user ? <><Link to="/account">Profile</Link><Link to="/dashboard">Dashboard</Link>{canOwner && <Link to="/owner">Owner dashboard</Link>}{canAgent && <Link to="/agent">Agent dashboard</Link>}{canAdmin && <Link to="/admin">Admin</Link>}<button type="button" className="mobile-menu-btn" onClick={signOut}>Sign out</button></>
        : <><Link to="/login">Sign in</Link><Link to="/signup">Create account</Link></>}</nav>}
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <Link to="/" aria-current={path === "/" ? "page" : undefined}><Home size={20}/><span>Home</span></Link>
      <Link to="/properties" aria-current={path === "/properties" && !onMap ? "page" : undefined} activeOptions={{ exact: true }}><Search size={20}/><span>Search</span></Link>
      <Link to="/properties" search={{ view: "map" }} aria-current={onMap ? "page" : undefined}><Map size={20}/><span>Map</span></Link>
      <Link to="/saved" aria-current={path === "/saved" ? "page" : undefined}><Heart size={20}/><span>Saved</span></Link>
      <Link to={user ? "/account" : "/login"} aria-current={path === "/account" || path === "/login" ? "page" : undefined}><User size={20}/><span>{user ? "Profile" : "Sign in"}</span></Link>
    </nav>
    <Link to="/list-property" className="post-fab">Post property</Link>
  </>;
}
