'use client';

import { useEffect, useRef, useState } from 'react';

export default function AnimatedCounter({ value, duration = 1.2, prefix = '', suffix = '', decimals = 0, format = false }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(format ? '0' : (0).toFixed(decimals));
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !played.current) {
            played.current = true;
            const target = Number(value) || 0;
            const start = performance.now();
            const tick = (now) => {
              const t = Math.min(1, (now - start) / (duration * 1000));
              const eased = 1 - Math.pow(1 - t, 3);
              const v = target * eased;
              setDisplay(format ? Math.round(v).toLocaleString('pt-BR') : v.toFixed(decimals));
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration, decimals, format]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
