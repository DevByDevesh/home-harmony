import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Once-only reveals keep off-screen work idle and leave the document's normal scroll untouched. */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12, margin: "0px 0px -30px 0px" }} transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : delay, ease: [0.2, 0.7, 0.2, 1] }}>{children}</motion.div>;
}

export function PageEntrance({ children, pageKey }: { children: ReactNode; pageKey: string }) {
  const reduced = useReducedMotion();
  return <motion.div key={pageKey} className="page-entrance" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.24, ease: "easeOut" }}>{children}</motion.div>;
}