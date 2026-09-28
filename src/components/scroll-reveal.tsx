import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

export function ScrollReveal() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = document.querySelectorAll<HTMLElement>(".section-intro, .section-heading, .philosophy-title, .philosophy-copy, .way-item, .closing-inner, .detail-section");
    targets.forEach((target) => target.classList.add("scroll-reveal"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px 35px 0px" });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}