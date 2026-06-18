import React, { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useTheme } from '../../contexts/ThemeContext'

export default function ThreeBackdrop({ sceneType = 'ocean' }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const { isDark } = useTheme()
  const darkRef = useRef(isDark)
  darkRef.current = isDark

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    let animId
    let currentType = sceneType

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)
    renderer.domElement.style.pointerEvents = 'none'

    const clock = new THREE.Clock()

    function buildOcean() {
      camera.position.set(0, 10, 28)
      camera.lookAt(0, 0, 0)

      scene.fog = new THREE.FogExp2(darkRef.current ? 0x0a0e17 : 0xf0f4f8, 0.008)

      scene.add(new THREE.AmbientLight(darkRef.current ? 0x1a365d : 0x87ceeb, darkRef.current ? 0.5 : 0.8))
      const sun = new THREE.DirectionalLight(darkRef.current ? 0xfbbf24 : 0xfff4e0, darkRef.current ? 0.6 : 1.0)
      sun.position.set(8, 15, 5)
      scene.add(sun)
      const rim = new THREE.DirectionalLight(0x38bdf8, 0.3)
      rim.position.set(-5, 3, -5)
      scene.add(rim)

      const geo = new THREE.PlaneGeometry(300, 300, 150, 150)
      const mat = new THREE.MeshPhongMaterial({
        color: darkRef.current ? 0x0c4a6e : 0x3b8ecf,
        shininess: 120,
        specular: darkRef.current ? 0x38bdf8 : 0xffffff,
        transparent: true,
        opacity: darkRef.current ? 0.55 : 0.4,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = -Math.PI / 2
      scene.add(mesh)

      const origZ = new Float32Array(geo.attributes.position.count)
      for (let i = 0; i < origZ.length; i++) origZ[i] = geo.attributes.position.getZ(i)

      const cubeCount = 120
      const cubeGeo = new THREE.BoxGeometry(1, 1, 1)
      const cubeMat = new THREE.MeshPhongMaterial({
        color: darkRef.current ? 0x38bdf8 : 0x7dd3fc,
        transparent: true,
        opacity: darkRef.current ? 0.35 : 0.3,
        shininess: 80,
        specular: 0xffffff,
      })
      const instancedMesh = new THREE.InstancedMesh(cubeGeo, cubeMat, cubeCount)
      scene.add(instancedMesh)

      const cubeData = []
      const dummy = new THREE.Object3D()
      for (let i = 0; i < cubeCount; i++) {
        cubeData.push({
          x: (Math.random() - 0.5) * 100,
          y: Math.random() * 6 + 1,
          z: (Math.random() - 0.5) * 100,
          sx: Math.random() * 0.8 + 0.2,
          sy: Math.random() * 0.8 + 0.2,
          sz: Math.random() * 0.8 + 0.2,
          rotSpeed: (Math.random() - 0.5) * 0.5,
          floatOffset: Math.random() * Math.PI * 2,
          floatSpeed: Math.random() * 0.3 + 0.2,
        })
      }

      return { type: 'ocean', geo, mat, origZ, instancedMesh, cubeData, cubeGeo, cubeMat, dummy }
    }

    function buildParticles() {
      camera.position.set(0, 5, 18)
      camera.lookAt(0, 0, 0)
      scene.fog = new THREE.FogExp2(darkRef.current ? 0x0a0e17 : 0xf0f4f8, 0.008)

      scene.add(new THREE.AmbientLight(darkRef.current ? 0x1a365d : 0x87ceeb, 0.6))
      const dl = new THREE.DirectionalLight(0xfbbf24, 0.5)
      dl.position.set(5, 10, 5)
      scene.add(dl)
      const rim2 = new THREE.DirectionalLight(0x38bdf8, 0.4)
      rim2.position.set(-3, 5, -3)
      scene.add(rim2)

      const count = 350
      const cubeGeo = new THREE.BoxGeometry(1, 1, 1)
      const colors = [
        darkRef.current ? 0x0ea5e9 : 0x0284c7,
        darkRef.current ? 0x38bdf8 : 0x7dd3fc,
        darkRef.current ? 0xfbbf24 : 0xf97316,
        darkRef.current ? 0x818cf8 : 0x6366f1,
        darkRef.current ? 0x34d399 : 0x10b981,
      ]
      const cubeMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: darkRef.current ? 0.5 : 0.4,
        shininess: 100,
        specular: 0xffffff,
      })
      const instancedMesh = new THREE.InstancedMesh(cubeGeo, cubeMat, count)
      scene.add(instancedMesh)

      const dummy = new THREE.Object3D()
      const cubeData = []
      for (let i = 0; i < count; i++) {
        const s = Math.random() * 1.2 + 0.15
        cubeData.push({
          x: (Math.random() - 0.5) * 50,
          y: (Math.random() - 0.5) * 25,
          z: (Math.random() - 0.5) * 50,
          sx: s * (0.5 + Math.random()),
          sy: s * (0.5 + Math.random()),
          sz: s * (0.5 + Math.random()),
          rotX: Math.random() * Math.PI,
          rotY: Math.random() * Math.PI,
          rotZ: Math.random() * Math.PI,
          rotSpeedX: (Math.random() - 0.5) * 0.4,
          rotSpeedY: (Math.random() - 0.5) * 0.3,
          floatOffset: Math.random() * Math.PI * 2,
          floatSpeedX: Math.random() * 0.4 + 0.1,
          floatSpeedY: Math.random() * 0.3 + 0.15,
        })
        dummy.position.set(cubeData[i].x, cubeData[i].y, cubeData[i].z)
        dummy.scale.set(cubeData[i].sx, cubeData[i].sy, cubeData[i].sz)
        dummy.rotation.set(cubeData[i].rotX, cubeData[i].rotY, cubeData[i].rotZ)
        dummy.updateMatrix()
        instancedMesh.setMatrixAt(i, dummy.matrix)

        const color = new THREE.Color(colors[i % colors.length])
        instancedMesh.setColorAt(i, color)
      }
      instancedMesh.instanceMatrix.needsUpdate = true
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true

      return { type: 'particles', instancedMesh, cubeData, dummy, cubeGeo, cubeMat }
    }

    let data = currentType === 'ocean' ? buildOcean() : buildParticles()

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      if (data.type === 'ocean') {
        const posAttr = data.geo.attributes.position
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i)
          const y = posAttr.getY(i)
          const w = Math.sin(x * 0.04 + t * 0.7) * 2.0
                  + Math.cos(y * 0.035 + t * 0.5) * 1.6
                  + Math.sin((x + y) * 0.025 + t * 0.3) * 1.0
                  + Math.sin(x * 0.08 + t * 1.2) * 0.4
                  + Math.cos(y * 0.06 - t * 0.9) * 0.3
          posAttr.setZ(i, data.origZ[i] + w)
        }
        posAttr.needsUpdate = true
        data.geo.computeVertexNormals()

        for (let i = 0; i < data.cubeData.length; i++) {
          const c = data.cubeData[i]
          data.dummy.position.set(
            c.x + Math.sin(t * 0.15 + c.floatOffset) * 2,
            c.y + Math.sin(t * c.floatSpeed + c.floatOffset) * 1.5,
            c.z + Math.cos(t * 0.1 + c.floatOffset) * 2
          )
          data.dummy.scale.set(c.sx, c.sy, c.sz)
          data.dummy.rotation.set(t * c.rotSpeed, t * c.rotSpeed * 0.7, 0)
          data.dummy.updateMatrix()
          data.instancedMesh.setMatrixAt(i, data.dummy.matrix)
        }
        data.instancedMesh.instanceMatrix.needsUpdate = true
      } else {
        for (let i = 0; i < data.cubeData.length; i++) {
          const c = data.cubeData[i]
          data.dummy.position.set(
            c.x + Math.sin(t * c.floatSpeedX + c.floatOffset) * 2.5,
            c.y + Math.sin(t * c.floatSpeedY + c.floatOffset) * 2.0,
            c.z + Math.cos(t * c.floatSpeedX * 0.5 + c.floatOffset) * 1.5
          )
          data.dummy.scale.set(c.sx, c.sy, c.sz)
          data.dummy.rotation.set(
            c.rotX + t * c.rotSpeedX,
            c.rotY + t * c.rotSpeedY,
            c.rotZ + t * c.rotSpeedX * 0.3
          )
          data.dummy.updateMatrix()
          data.instancedMesh.setMatrixAt(i, data.dummy.matrix)
        }
        data.instancedMesh.instanceMatrix.needsUpdate = true
        data.instancedMesh.rotation.y = t * 0.012
      }

      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animId)
      renderer.dispose()
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material.dispose()
        }
      })
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [sceneType, isDark])

  return (
    <div ref={containerRef} className="fixed inset-0 z-0" style={{ pointerEvents: 'none' }} />
  )
}
