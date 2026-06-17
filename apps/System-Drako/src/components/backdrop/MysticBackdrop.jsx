import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function MysticBackdrop() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let raf, renderer, scene, camera, stars, embers
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x050403, 0.0011)

    camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 2400)
    camera.position.z = 1

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setClearColor(0x000000, 0)
    renderer.autoClearColor = true
    mount.appendChild(renderer.domElement)

    const W = 1500   // half-width spread
    const H = 1300   // half-height spread

    // ---------- Starfield as line segments (warp streaks) ----------
    const COUNT = 1400
    const positions = new Float32Array(COUNT * 2 * 3)
    const colors = new Float32Array(COUNT * 2 * 3)
    const state = new Float32Array(COUNT * 4) // x, y, z, baseLen

    const goldish = [new THREE.Color('#f6d98c'), new THREE.Color('#e0ad33'), new THREE.Color('#fff8e6'), new THREE.Color('#c8921b')]
    const embersCol = [new THREE.Color('#ff8a3d'), new THREE.Color('#f2661b')]
    const pick = arr => arr[Math.floor(Math.random() * arr.length)]

    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * W * 2
      const y = (Math.random() - 0.5) * H * 2
      const z = (Math.random() - 0.5) * W * 1.6
      state[i * 4] = x; state[i * 4 + 1] = y; state[i * 4 + 2] = z; state[i * 4 + 3] = 2 + Math.random() * 4
      const c = pick(goldish)
      // bottom vertex
      positions[i * 6] = x;     positions[i * 6 + 1] = y;     positions[i * 6 + 2] = z
      positions[i * 6 + 3] = x; positions[i * 6 + 4] = y;     positions[i * 6 + 5] = z
      const k = 0.6 + (Math.random() * 0.6)
      colors[i * 6] = c.r * k; colors[i * 6 + 1] = c.g * k; colors[i * 6 + 2] = c.b * k
      colors[i * 6 + 3] = c.r; colors[i * 6 + 4] = c.g; colors[i * 6 + 5] = c.b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const starMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    stars = new THREE.LineSegments(geo, starMat)
    scene.add(stars)

    // round sprite for embers
    const sprite = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64
      const ctx = c.getContext('2d')
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
      g.addColorStop(0, 'rgba(255,248,230,1)'); g.addColorStop(0.3, 'rgba(242,102,27,0.7)'); g.addColorStop(1, 'rgba(242,102,27,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64)
      return new THREE.CanvasTexture(c)
    })()

    const ECOUNT = 70
    const epos = new Float32Array(ECOUNT * 3)
    const ecol = new Float32Array(ECOUNT * 3)
    const estate = new Float32Array(ECOUNT * 3)
    for (let i = 0; i < ECOUNT; i++) {
      epos[i * 3] = (Math.random() - 0.5) * W * 1.8
      epos[i * 3 + 1] = (Math.random() - 0.5) * H * 2
      epos[i * 3 + 2] = (Math.random() - 0.5) * W * 1.4
      estate[i * 3] = epos[i * 3]; estate[i * 3 + 1] = epos[i * 3 + 1]; estate[i * 3 + 2] = epos[i * 3 + 2]
      const c = pick(embersCol); ecol[i * 3] = c.r; ecol[i * 3 + 1] = c.g; ecol[i * 3 + 2] = c.b
    }
    const egeo = new THREE.BufferGeometry()
    egeo.setAttribute('position', new THREE.BufferAttribute(epos, 3))
    egeo.setAttribute('color', new THREE.BufferAttribute(ecol, 3))
    const eMat = new THREE.PointsMaterial({ size: 14, map: sprite, vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })
    embers = new THREE.Points(egeo, eMat)
    scene.add(embers)

    // ---------- Scroll / mouse input ----------
    const input = { warp: 0, targetWarp: 0, mouseX: 0, mouseY: 0 }
    let lastY = window.scrollY
    const onScroll = () => {
      const dy = window.scrollY - lastY
      lastY = window.scrollY
      input.targetWarp = Math.min(60, input.targetWarp + Math.abs(dy) * 0.9)
    }
    const onWheel = (e) => { input.targetWarp = Math.min(60, input.targetWarp + Math.abs(e.deltaY) * 0.5) }
    const onMove = (e) => { input.mouseX = (e.clientX / window.innerWidth - 0.5); input.mouseY = (e.clientY / window.innerHeight - 0.5) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('mousemove', onMove)

    const clock = new THREE.Clock()
    const posAttr = geo.attributes.position
    const ePosAttr = egeo.attributes.position

    const tick = () => {
      const dt = Math.min(0.05, clock.getDelta())
      const t = clock.elapsedTime
      // ease warp back to idle (idle = still starfield); snappy settle ~0.3s
      input.targetWarp += (0 - input.targetWarp) * (reduce ? 0 : 0.2)
      input.warp += (input.targetWarp - input.warp) * 0.25
      const warp = reduce ? 0 : input.warp
      const speed = warp * 1.05 * 60 * dt          // 0 at idle -> stars stand still
      const len = warp                              // streak length scales with warp (dots at idle)

      for (let i = 0; i < COUNT; i++) {
        let x = state[i * 4], y = state[i * 4 + 2] != null ? state[i * 4 + 1] : 0
        const z = state[i * 4 + 2]
        const depth = (z + W * 0.8) / (W * 1.6) // 0..1 parallax
        const vy = speed * (0.4 + depth * 1.2)
        y -= vy
        if (y < -H) { y = H; x = (Math.random() - 0.5) * W * 2; state[i * 4] = x }
        state[i * 4 + 1] = y
        const streak = len * (4 + depth * 20)
        positions[i * 6] = x;     positions[i * 6 + 1] = y;            positions[i * 6 + 2] = z
        positions[i * 6 + 3] = x; positions[i * 6 + 4] = y + streak;  positions[i * 6 + 5] = z
      }
      posAttr.needsUpdate = true

      for (let i = 0; i < ECOUNT; i++) {
        let x = estate[i * 3], y = estate[i * 3 + 1], z = estate[i * 3 + 2]
        const depth = (z + W * 0.8) / (W * 1.6)
        const eDrift = (0.35 + warp * 0.6) * 60 * dt   // gentle floor + warp: alive but calm
        y -= eDrift * (0.5 + depth) * 0.7
        if (y < -H) { y = H; x = (Math.random() - 0.5) * W * 1.8; estate[i * 3] = x }
        estate[i * 3 + 1] = y
        epos[i * 3] = x; epos[i * 3 + 1] = y + Math.sin(t * 0.7 + i) * 0.5; epos[i * 3 + 2] = z
      }
      ePosAttr.needsUpdate = true

      camera.position.x += (input.mouseX * 80 - camera.position.x) * 0.03
      camera.position.y += (-input.mouseY * 50 - camera.position.y) * 0.03
      camera.lookAt(scene.position)
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
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose(); geo.dispose(); starMat.dispose(); egeo.dispose(); eMat.dispose(); sprite.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [])

  return <div id="drako-backdrop" ref={mountRef} aria-hidden="true" />
}
