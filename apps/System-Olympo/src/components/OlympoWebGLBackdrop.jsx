import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function OlympoWebGLBackdrop() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.z = 7

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))
    renderer.setSize(window.innerWidth, window.innerHeight)

    const runeGroup = new THREE.Group()
    scene.add(runeGroup)

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xc9a84c,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const blueMaterial = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const ringGeometry = new THREE.TorusGeometry(2.2, 0.01, 8, 160)
    const knotGeometry = new THREE.TorusKnotGeometry(1.45, 0.006, 160, 8, 2, 5)
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    const inner = new THREE.Mesh(knotGeometry, blueMaterial)
    runeGroup.add(ring, inner)

    const glyphMaterial = new THREE.MeshBasicMaterial({
      color: 0xe8c97e,
      transparent: true,
      opacity: 0.17,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const glyphGeometry = new THREE.IcosahedronGeometry(0.035, 0)
    const glyphs = []
    for (let i = 0; i < 36; i += 1) {
      const glyph = new THREE.Mesh(glyphGeometry, glyphMaterial)
      const angle = (i / 36) * Math.PI * 2
      glyph.position.set(Math.cos(angle) * 2.85, Math.sin(angle) * 2.85, (i % 3) * 0.08)
      glyph.rotation.z = angle
      glyphs.push(glyph)
      runeGroup.add(glyph)
    }

    const mistMaterial = new THREE.PointsMaterial({
      color: 0x9ee7ff,
      size: 0.018,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const mistGeometry = new THREE.BufferGeometry()
    const mistPositions = new Float32Array(240 * 3)
    for (let i = 0; i < 240; i += 1) {
      mistPositions[i * 3] = (Math.random() - 0.5) * 12
      mistPositions[i * 3 + 1] = (Math.random() - 0.5) * 8
      mistPositions[i * 3 + 2] = -1 - Math.random() * 4
    }
    mistGeometry.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3))
    const mist = new THREE.Points(mistGeometry, mistMaterial)
    scene.add(mist)

    let frameId = 0
    const clock = new THREE.Clock()

    function resize() {
      const width = window.innerWidth
      const height = window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    function animate() {
      const t = clock.getElapsedTime()
      runeGroup.rotation.z = t * 0.035
      inner.rotation.x = Math.sin(t * 0.22) * 0.18
      inner.rotation.y = t * -0.05
      ring.scale.setScalar(1 + Math.sin(t * 0.6) * 0.025)
      glyphs.forEach((glyph, index) => {
        glyph.scale.setScalar(1 + Math.sin(t * 1.4 + index) * 0.45)
      })
      mist.rotation.z = t * -0.008
      mist.rotation.y = Math.sin(t * 0.08) * 0.06
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    resize()
    animate()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      ringGeometry.dispose()
      knotGeometry.dispose()
      glyphGeometry.dispose()
      mistGeometry.dispose()
      ringMaterial.dispose()
      blueMaterial.dispose()
      glyphMaterial.dispose()
      mistMaterial.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      aria-hidden="true"
      style={{ width: '100vw', height: '100vh', zIndex: -2 }}
    />
  )
}
