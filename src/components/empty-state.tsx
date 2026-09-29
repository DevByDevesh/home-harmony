import type { ReactNode } from "react";
export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-result" role="status">{icon}<h2>{title}</h2><p>{children}</p>{action && <div className="empty-action">{action}</div>}</div>;
}
export function TileSkeletons({ count = 3 }: { count?: number }) {
  return <div className="home-grid" aria-busy="true" aria-label="Loading">{Array.from({ length: count }, (_, i) => <div key={i} className="tile-skeleton"><span/><span/><span/></div>)}</div>;
}
