import { useEffect, useRef } from 'react'

export function AuthBackdrop3D({ intensity = 'login' }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let disposed = false
    let teardown = () => {}

    const setup = async () => {
      const THREE = await import('three')
      if (disposed || !mount.isConnected) return

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100)
      camera.position.set(0, 0, 14)
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      mount.appendChild(renderer.domElement)

      const sphereCount = 1800
      const positions = new Float32Array(sphereCount * 3)
      const originalPositions = new Float32Array(sphereCount * 3)
      const colors = new Float32Array(sphereCount * 3)
      const baseColor = new THREE.Color('#e7c889')
      const accentColor = new THREE.Color('#baa0f6')
      const radius = 6.4

      for (let i = 0; i < sphereCount; i += 1) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const r = radius * (0.92 + Math.random() * 0.18)
        const x = r * Math.sin(phi) * Math.cos(theta)
        const y = r * Math.sin(phi) * Math.sin(theta)
        const z = r * Math.cos(phi)
        positions[i * 3] = x
        positions[i * 3 + 1] = y
        positions[i * 3 + 2] = z
        originalPositions[i * 3] = x
        originalPositions[i * 3 + 1] = y
        originalPositions[i * 3 + 2] = z
        const mix = Math.random()
        const color = baseColor.clone().lerp(accentColor, mix * 0.4)
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const sphere = new THREE.Points(geometry, material)
      scene.add(sphere)

      const ringGeometry = new THREE.TorusGeometry(radius * 1.18, 0.018, 12, 220)
      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xd9b777, transparent: true, opacity: 0.22 })
      const ring1 = new THREE.Mesh(ringGeometry, ringMaterial)
      ring1.rotation.x = Math.PI / 3
      scene.add(ring1)
      const ring2 = new THREE.Mesh(ringGeometry, ringMaterial.clone())
      ring2.material.opacity = 0.14
      ring2.rotation.x = -Math.PI / 5
      ring2.rotation.y = Math.PI / 4
      scene.add(ring2)

      const innerGlow = new THREE.PointLight(0xe7c889, 1.2, 30)
      innerGlow.position.set(0, 0, 0)
      scene.add(innerGlow)

      let frame = null
      const clock = new THREE.Clock()
      const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 }

      const onPointerMove = (event) => {
        const rect = mount.getBoundingClientRect()
        mouse.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.4
        mouse.targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.4
      }
      window.addEventListener('pointermove', onPointerMove)

      const render = () => {
        frame = null
        if (document.hidden) return
        const elapsed = clock.getElapsedTime()
        mouse.x += (mouse.targetX - mouse.x) * 0.05
        mouse.y += (mouse.targetY - mouse.y) * 0.05
        sphere.rotation.y = elapsed * 0.05 + mouse.x * 0.6
        sphere.rotation.x = mouse.y * 0.4 + Math.sin(elapsed * 0.2) * 0.05
        ring1.rotation.z = elapsed * 0.08
        ring2.rotation.z = -elapsed * 0.05

        const posAttr = geometry.attributes.position
        const pulse = Math.sin(elapsed * 1.4) * 0.04 + (intensity === 'signup' ? 0.06 : 0.02)
        for (let i = 0; i < sphereCount; i += 1) {
          const ox = originalPositions[i * 3]
          const oy = originalPositions[i * 3 + 1]
          const oz = originalPositions[i * 3 + 2]
          const wave = Math.sin(elapsed * 1.6 + oy * 0.5 + ox * 0.3) * pulse
          posAttr.array[i * 3] = ox * (1 + wave)
          posAttr.array[i * 3 + 1] = oy * (1 + wave)
          posAttr.array[i * 3 + 2] = oz * (1 + wave)
        }
        posAttr.needsUpdate = true
        renderer.render(scene, camera)
        frame = requestAnimationFrame(render)
      }
      frame = requestAnimationFrame(render)

      const resizeObserver = new ResizeObserver(() => {
        if (!mount.clientWidth || !mount.clientHeight) return
        camera.aspect = mount.clientWidth / mount.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(mount.clientWidth, mount.clientHeight)
      })
      resizeObserver.observe(mount)

      teardown = () => {
        if (frame !== null) cancelAnimationFrame(frame)
        window.removeEventListener('pointermove', onPointerMove)
        resizeObserver.disconnect()
        renderer.dispose()
        geometry.dispose()
        material.dispose()
        ringGeometry.dispose()
        ring1.material.dispose()
        ring2.material.dispose()
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
      }
      if (disposed) teardown()
    }

    let idleId
    if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(setup, { timeout: 600 })
    else idleId = window.setTimeout(setup, 100)

    return () => {
      disposed = true
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(idleId)
      else window.clearTimeout(idleId)
      teardown()
    }
  }, [intensity])

  return <div className="auth-backdrop-3d" ref={mountRef} aria-hidden="true" />
}
