import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, BadgeCheck, Bell, Heart, Home, Map, Menu, MessageSquare, Search, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUserData } from "@/lib/user-data";
import { useCurrentUser, useSignOut } from "@/lib/auth/use-current-user";
import { AREA_ROLES, getRoleDashboardPath, roleLabel } from "@/lib/auth/roles";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listConversationsFn, listNotificationsFn, markNotificationReadFn } from "@/lib/engagement.functions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Navigation() {
  const [open, setOpen] = useState(false);
  const { path, view } = useRouterState({ select: s => ({ path: s.location.pathname, view: (s.location.search as { view?: string }).view }) });
  const { data } = useUserData();
  const { user } = useCurrentUser(); const signOut = useSignOut();
  const fetchConversations = useServerFn(listConversationsFn);
  const conversations = useQuery({ queryKey: ["conversations"], queryFn: () => fetchConversations(), enabled: !!user, staleTime: 0, refetchInterval: user ? 5000 : false });
  const fetchNotifications = useServerFn(listNotificationsFn);
  const readNotification = useServerFn(markNotificationReadFn);
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => fetchNotifications(), enabled: !!user, staleTime: 10000 });
  const lastInboundRef = useRef<Record<string, string> | null>(null);
  useEffect(() => {
    if (!user || !conversations.data) { lastInboundRef.current = null; return; }
    const current: Record<string, string> = {};
    for (const conversation of conversations.data) {
      const message = conversation.lastMessage;
      if (!message) continue;
      const key = `${conversation.id}:${message.createdAt}`;
      current[conversation.id] = key;
      if (lastInboundRef.current && lastInboundRef.current[conversation.id] !== key && message.senderId !== user.id && !message.readAt) {
        const preview = message.body.length > 100 ? `${message.body.slice(0, 100)}…` : message.body;
        toast("New message received", {
          description: preview,
          duration: 7000,
          action: { label: "Open chat", onClick: () => { window.location.href = "/messages"; } },
        });
      }
    }
    lastInboundRef.current = current;
  }, [user?.id, conversations.data]);
  const unreadNotifications = user ? (notifications.data ?? []).filter(n => !n.read).length : 0;
  const unreadMessages = user ? (conversations.data ?? []).filter(c => c.lastMessage && c.lastMessage.senderId !== user.id && !c.lastMessage.readAt).length : 0;
  const canAgent = !!user && AREA_ROLES.agent.includes(user.role), canAdmin = !!user && AREA_ROLES.admin.includes(user.role);
  const dashboardPath = user ? getRoleDashboardPath(user.role) : "/dashboard";
  const dashboardLabel = user?.role === "OWNER" ? "Owner dashboard" : user?.role === "ADMIN" ? "Admin dashboard" : "Dashboard";
  const onMap = path === "/properties" && (view === "map" || view === "satellite");
  return <>
    <header className={`navigation ${path === "/" ? "navigation-home" : ""}`}><div className="wrap navigation-inner">
      <Link to="/" className="wordmark" aria-label="HouseProvider home"><span className="wordmark-symbol">h<span>·</span></span><span>houseprovider<span className="wordmark-domain">.in</span></span></Link>
      <nav className="nav-links" aria-label="Main navigation"><Link to="/properties" search={{ mode: "Rent" }}>Rent</Link><Link to="/properties" search={{ mode: "Buy" }}>Buy</Link><Link to="/properties" search={{ view: "map" }}>Map</Link><Link to="/compare">Compare</Link></nav>
      <div className="nav-actions">
        {user && <Link to="/messages" className="nav-icon nav-message" aria-label={`Messages${unreadMessages ? ` (${unreadMessages} unread)` : ""}`}><MessageSquare size={18}/>{unreadMessages > 0 && <span className="nav-dot">{unreadMessages > 9 ? "9+" : unreadMessages}</span>}</Link>}
        {user && <DropdownMenu>
          <DropdownMenuTrigger className="nav-icon nav-notifications" aria-label={`Notifications${unreadNotifications ? ` (${unreadNotifications} unread)` : ""}`}><Bell size={18}/>{unreadNotifications > 0 && <span className="nav-dot">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="nav-notifications-menu">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel><DropdownMenuSeparator/>
            <DropdownMenuItem asChild><Link to="/dashboard" search={{ tab: "notifications" }}>View all notifications</Link></DropdownMenuItem>
            {(notifications.data ?? []).length ? (notifications.data ?? []).slice(0, 8).map(n => <DropdownMenuItem key={n.id} className={n.read ? "notification-read" : "notification-unread"} onSelect={() => { if (!n.read) { void readNotification({ data: { id: n.id } }).then(() => void notifications.refetch()); } }}>
              <span><strong>{n.title}</strong><small>{n.message}</small></span>
            </DropdownMenuItem>) : <DropdownMenuItem disabled>No notifications yet.</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>}
        <Link to="/saved" className="nav-icon" aria-label={`Saved properties (${data.saved.length})`}><Heart size={18}/>{data.saved.length > 0 && <span className="nav-dot">{data.saved.length}</span>}</Link>
        {user
          ? <DropdownMenu><DropdownMenuTrigger className="nav-icon nav-account" aria-label={`Account menu for ${user.name || user.email}`}>{user.image ? <img className="nav-account-avatar" src={user.image} alt="" /> : <User size={18}/>}</DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="nav-account-menu">
                <DropdownMenuLabel><span className="nav-profile-identity">{user.image ? <img className="nav-profile-avatar" src={user.image} alt="" /> : <span className="nav-profile-avatar nav-profile-avatar-fallback"><User size={18}/></span>}<span className="nav-profile-copy"><span className="nav-profile-name">{user.name || user.email}{user.verifiedBadge && <BadgeCheck className="verified-badge-icon" size={15} aria-label="Verified HouseProvider member" />}</span><small>{roleLabel[user.role]}</small></span></span></DropdownMenuLabel><DropdownMenuSeparator/>
                <DropdownMenuItem asChild><Link to="/account">Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to={dashboardPath}>{dashboardLabel}</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/messages"><MessageSquare size={15}/> Messages{unreadMessages > 0 ? ` (${unreadMessages})` : ""}</Link></DropdownMenuItem>
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
      {user ? <><Link to="/account">Profile</Link><Link to={dashboardPath}>{dashboardLabel}</Link><Link to="/messages">Messages{unreadMessages > 0 ? ` (${unreadMessages})` : ""}</Link>{canAgent && <Link to="/agent">Agent dashboard</Link>}{canAdmin && <Link to="/admin">Admin</Link>}<button type="button" className="mobile-menu-btn" onClick={signOut}>Sign out</button></>
        : <><Link to="/login">Sign in</Link><Link to="/signup">Create account</Link></>}</nav>}
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <Link to="/" aria-current={path === "/" ? "page" : undefined}><Home size={20}/><span>Home</span></Link>
      <Link to="/properties" aria-current={path === "/properties" && !onMap ? "page" : undefined} activeOptions={{ exact: true }}><Search size={20}/><span>Search</span></Link>
      <Link to="/properties" search={{ view: "map" }} aria-current={onMap ? "page" : undefined}><Map size={20}/><span>Map</span></Link>
      <Link to="/saved" aria-current={path === "/saved" ? "page" : undefined}><Heart size={20}/><span>Saved</span></Link>
      <Link to={user ? "/account" : "/login"} aria-current={path === "/account" || path === "/login" ? "page" : undefined}><User size={20}/><span>{user ? "Profile" : "Sign in"}</span></Link>
    </nav>
    {path === "/" && <Link to={user ? "/messages" : "/login"} className="home-messages-fab" aria-label={user ? `Open messages${unreadMessages ? `, ${unreadMessages} unread` : ""}` : "Sign in to message"}><MessageSquare size={21}/><span>Messages</span>{unreadMessages > 0 && <span className="home-messages-count">{unreadMessages > 9 ? "9+" : unreadMessages}</span>}</Link>}
    <Link to="/list-property" className="post-fab">Post property</Link>
  </>;
}
