(function () {
  const canvas = document.getElementById('bg-canvas')
  const ctx = canvas.getContext('2d')
  let w, h, particles = [], mouse = { x: -1000, y: -1000 }

  function resize() {
    w = canvas.width = window.innerWidth
    h = canvas.height = window.innerHeight
  }

  function createParticles() {
    particles = []
    const count = Math.min(80, Math.floor((w * h) / 15000))
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.3 + 0.1,
      })
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h)
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0) p.x = w
      if (p.x > w) p.x = 0
      if (p.y < 0) p.y = h
      if (p.y > h) p.y = 0

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(201, 168, 76, ${p.a})`
      ctx.fill()

      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j]
        const dx = p.x - q.x
        const dy = p.y - q.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150) {
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(q.x, q.y)
          ctx.strokeStyle = `rgba(201, 168, 76, ${0.06 * (1 - dist / 150)})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }

      const mdx = p.x - mouse.x
      const mdy = p.y - mouse.y
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy)
      if (mdist < 200) {
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(mouse.x, mouse.y)
        ctx.strokeStyle = `rgba(201, 168, 76, ${0.12 * (1 - mdist / 200)})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }
    requestAnimationFrame(draw)
  }

  resize()
  createParticles()
  draw()

  window.addEventListener('resize', () => { resize(); createParticles() })
  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY })

  // ── Card mouse glow tracking ──
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      card.style.setProperty('--mx', x + '%')
      card.style.setProperty('--my', y + '%')
    })
  })

  // ── Scroll animations ──
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible')
        }, i * 100)
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })

  document.querySelectorAll('.project-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.08}s`
    observer.observe(card)
  })

  // ── Nav scroll state ──
  const nav = document.querySelector('.nav')
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50)
  }, { passive: true })
})()
