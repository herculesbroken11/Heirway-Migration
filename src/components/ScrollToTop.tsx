import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // If a hash is present, scroll to the target element instead of the top.
    if (hash) {
      const id = hash.slice(1);
      const scrollToEl = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return true;
        }
        return false;
      };

      if (scrollToEl()) return;
      // Element may not be mounted yet — retry shortly.
      const frame = window.requestAnimationFrame(() => {
        if (!scrollToEl()) {
          window.setTimeout(scrollToEl, 120);
        }
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const scrollTop = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    scrollTop();
    const frame = window.requestAnimationFrame(scrollTop);
    const timer = window.setTimeout(scrollTop, 120);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname, search, hash]);

  return null;
};

export default ScrollToTop;
