"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

export function useGsapFadeIn(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.fromTo(
      el,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.6, delay, ease: "power2.out" }
    );
  }, [delay]);

  return ref;
}

export function useGsapStagger(selector: string, delay = 0) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll(selector);
    gsap.fromTo(
      items,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.06,
        delay,
        ease: "power2.out",
      }
    );
  }, [selector, delay]);

  return containerRef;
}
