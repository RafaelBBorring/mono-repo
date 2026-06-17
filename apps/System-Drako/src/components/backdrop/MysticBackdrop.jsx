import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function MysticBackdrop() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let raf, renderer, scene, camera, dots
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x050403, 0.0009)

    camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.1, 2400)
    camera.position.z = 620

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    // few floating dots only — they become streaks (trail) on scroll
    const COUNT = 160
    const W = 1400, H = 1200
    const positions = new Float32Array(COUNT * 2 * 3)
    const colors = new Float32Array(COUNT * 2 * 3)
    const state = new Float32Array(COUNT * 4) // x, y, z, phase
    const palette = [new THREE.Color('#f6d98c'), new THREE.Color('#e0ad33'), new THREE.Color('#fff8e6'), new THREE.Color('#c8921b'), new THREE.Color('#ff9a52')]
    const pick = arr => arr[Math.floor(Math.random() * arr.length)]

    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * W * 2
      const y = (Math.random() - 0.5) * H * 2
      const z = (Math.random() - 0.5) * W * 1.4
      state[i * 4] = x; state[i * 4 + 1] = y; state[i * 4 + 2] = z; state[i * 4 + 3] = Math.random() * Math.PI * 2
      positions[i * 6] = x; positions[i * 6 + 1] = y; positions[i * 6 + 2] = z
      positions[i * 6 + 3] = x; positions[i * 6 + 4] = y; positions[i * 6 + 5] = z
      const c = pick(palette)
      const k = 0.5 + Math.random() * 0.5
      colors[i * 6] = c.r * k; colors[i * 6 + 1] = c.g * k; colors[i * 6 + 2] = c.b * k
      colors[i * 6 + 3] = c.r; colors[i * 6 + 4] = c.g; colors[i * 6 + 5] = c.b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
    dots = new THREE.LineSegments(geo, mat)
    scene.add(dots)

    // scroll drives the warp (the trail). idle = calm floating dots.
    const input = { warp: 0, targetWarp: 0 }
    let lastY = window.scrollY
    const onScroll = () => { const dy = window.scrollY - lastY; lastY = window.scrollY; input.targetWarp = Math.min(70, input.targetWarp + Math.abs(dy) * 1.1) }
    const onWheel = (e) => { input.targetWarp = Math.min(70, input.targetWarp + Math.abs(e.deltaY) * 0.6) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })

    const clock = new THREE.Clock()
    const posAttr = geo.attributes.position

    const tick = () => {
      const dt = Math.min(0.05, clock.getDelta())
      const t = clock.elapsedTime
      input.targetWarp += (0 - input.targetWarp) * (reduce ? 0.4 : 0.18)
      input.warp += (input.targetWarp - input.warp) * 0.22
      const warp = reduce ? 0 : input.warp
      const idleDrift = 2.4                 // gentle constant float when still
      const speed = (idleDrift + warp * 2.4) * 60 * dt
      const len = 0.6 + warp * 1.1          // tiny dash at idle -> long streak on scroll

      for (let i = 0; i < COUNT; i++) {
        let x = state[i * 4], y = state[i * 4 + 1]
        const z = state[i * 4 + 2]
        const ph = state[i * 4 + 3]
        const depth = (z + W * 0.7) / (W * 1.4)
        const sway = Math.sin(t * 0.3 + ph) * (0.25 + depth * 0.3) * (1 + warp)
        y -= speed * (0.5 + depth)
        x += sway * dt * 8
        if (y < -H) { y = H; x = (Math.random() - 0.5) * W * 2; state[i * 4] = x; state[i * 4 + 3] = Math.random() * Math.PI * 2 }
        state[i * 4 + 1] = y
        const streak = len * (3 + depth * 22)
        positions[i * 6] = x;     positions[i * 6 + 1] = y;           positions[i * 6 + 2] = z
        positions[i * 6 + 3] = x; positions[i * 6 + 4] = y + streak; positions[i * 6 + 5] = z
      }
      posAttr.needsUpdate = true

      mat.opacity = 0.42 + Math.min(0.4, warp * 0.02)
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    tick()

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      renderer.dispose(); geo.dispose(); mat.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [])

  return <div id="drako-backdrop" ref={mountRef} aria-hidden="true" />
}
