import React, { useEffect, useRef } from 'react'

export default function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setTimeout(() => el.classList.add('in'), delay)
          io.unobserve(el)
        }
      })
    }, { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [delay])
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>
}
