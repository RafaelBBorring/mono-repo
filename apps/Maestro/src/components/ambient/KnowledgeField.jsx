import { useEffect, useRef } from 'react'

export function KnowledgeField({ subtle = false }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData) return undefined
    let disposed = false
    let idleId
    let teardown = () => {}

    const setup = async () => {
      const THREE = await import('three')
      if (disposed || !mount.isConnected) return
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 100)
      camera.position.z = 18
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.25 : 1.6))
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      mount.appendChild(renderer.domElement)

      const count = subtle ? 36 : 64
      const positions = new Float32Array(count * 3)
      const points = []
      for (let index = 0; index < count; index += 1) {
        const point = new THREE.Vector3((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 7)
        points.push(point)
        positions[index * 3] = point.x
        positions[index * 3 + 1] = point.y
        positions[index * 3 + 2] = point.z
      }
      const pointsGeometry = new THREE.BufferGeometry()
      pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const pointsMaterial = new THREE.PointsMaterial({ color: 0xe7c889, size: subtle ? 0.055 : 0.085, transparent: true, opacity: subtle ? 0.3 : 0.7 })
      const pointCloud = new THREE.Points(pointsGeometry, pointsMaterial)
      scene.add(pointCloud)

      const linePositions = []
      for (let a = 0; a < count; a += 1) {
        for (let b = a + 1; b < count; b += 1) {
          if (points[a].distanceTo(points[b]) < 3.1 && linePositions.length < count * 15) linePositions.push(points[a].x, points[a].y, points[a].z, points[b].x, points[b].y, points[b].z)
        }
      }
      const lineGeometry = new THREE.BufferGeometry()
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xa88b54, transparent: true, opacity: subtle ? 0.07 : 0.16 })
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
      scene.add(lines)

      let frame = null
      let inViewport = true
      const clock = new THREE.Clock()
      const render = () => {
        frame = null
        if (!inViewport || document.hidden) return
        const elapsed = clock.getElapsedTime()
        pointCloud.rotation.y = elapsed * 0.014
        lines.rotation.y = elapsed * 0.014
        pointCloud.rotation.x = Math.sin(elapsed * 0.12) * 0.025
        lines.rotation.x = pointCloud.rotation.x
        renderer.render(scene, camera)
        frame = requestAnimationFrame(render)
      }
      const start = () => {
        if (frame === null && inViewport && !document.hidden) frame = requestAnimationFrame(render)
      }
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        inViewport = entry.isIntersecting
        if (inViewport) start()
        else if (frame !== null) {
          cancelAnimationFrame(frame)
          frame = null
        }
      })
      visibilityObserver.observe(mount)
      const handleVisibility = () => {
        if (document.hidden && frame !== null) {
          cancelAnimationFrame(frame)
          frame = null
        } else start()
      }
      document.addEventListener('visibilitychange', handleVisibility)
      start()

      const resizeObserver = new ResizeObserver(() => {
        if (!mount.clientWidth || !mount.clientHeight) return
        camera.aspect = mount.clientWidth / mount.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(mount.clientWidth, mount.clientHeight)
      })
      resizeObserver.observe(mount)

      teardown = () => {
        if (frame !== null) cancelAnimationFrame(frame)
        visibilityObserver.disconnect()
        resizeObserver.disconnect()
        document.removeEventListener('visibilitychange', handleVisibility)
        renderer.dispose()
        pointsGeometry.dispose()
        pointsMaterial.dispose()
        lineGeometry.dispose()
        lineMaterial.dispose()
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
      }
      if (disposed) teardown()
    }

    if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(setup, { timeout: 900 })
    else idleId = window.setTimeout(setup, 120)

    return () => {
      disposed = true
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(idleId)
      else window.clearTimeout(idleId)
      teardown()
    }
  }, [subtle])

  return <div className="knowledge-field" ref={mountRef} aria-hidden="true" />
}
