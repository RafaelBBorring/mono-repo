"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import anime from "animejs";

/**
 * Efeito magnético: o elemento segue suavemente o cursor quando ele está próximo.
 * Usa GSAP para um tween amortecido.
 */
export function useGsapMagnetic<T extends HTMLElement = HTMLButtonElement>(strength = 0.35) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      xTo(relX * strength);
      yTo(relY * strength);
    };
    const onLeave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [strength]);
  return ref;
}

/**
 * Conta de 0 até `value` quando o elemento entra na viewport, usando anime.js.
 * Atualiza o textContent do elemento alvo.
 */
export function useAnimeCount(value: number, duration = 1600) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      const obj = { n: 0 };
      anime({
        targets: obj,
        n: value,
        duration,
        easing: "easeOutExpo",
        update: () => {
          el.textContent = String(Math.round(obj.n));
        },
      });
    };
    if (!("IntersectionObserver" in window)) {
      start();
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          start();
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);
  return ref;
}
