'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'

interface OrbCanvasProps {
  pulse?: boolean
  expand?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function OrbCanvas({
  pulse = false,
  expand = false,
  size = 'md',
  className = '',
}: OrbCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    coreMesh: THREE.Mesh
    shellMesh: THREE.Mesh
    particles: THREE.Points
    animId: number
    targetRotX: number
    targetRotY: number
    currentRotX: number
    currentRotY: number
    pulsePhase: number
    pulseActive: boolean
    pulseStartTime: number
    baseScale: number
  } | null>(null)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!sceneRef.current) return
    const x = (e.clientX / window.innerWidth - 0.5) * 2
    const y = (e.clientY / window.innerHeight - 0.5) * 2
    sceneRef.current.targetRotY = x * 0.4
    sceneRef.current.targetRotX = -y * 0.4
  }, [])

  const handleDeviceOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (!sceneRef.current) return
    const gamma = e.gamma ?? 0 // left/right tilt
    const beta = e.beta ?? 0   // front/back tilt
    sceneRef.current.targetRotY = (gamma / 90) * 0.4
    sceneRef.current.targetRotX = ((beta - 45) / 90) * 0.4
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return

    const container = canvasRef.current
    const w = container.clientWidth
    const h = container.clientHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    // Scene & Camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
    camera.position.z = 3

    // Core sphere — dark purple emissive
    const coreGeo = new THREE.IcosahedronGeometry(0.7, 4)
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0x4A0E8F,
      emissive: 0x7B2FBE,
      emissiveIntensity: 0.6,
      shininess: 80,
    })
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    scene.add(coreMesh)

    // Wireframe overlay on core
    const wireGeo = new THREE.IcosahedronGeometry(0.72, 2)
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xC084FC,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    })
    const wireMesh = new THREE.Mesh(wireGeo, wireMat)
    scene.add(wireMesh)

    // Outer shell — semi-transparent, refractive look
    const shellGeo = new THREE.SphereGeometry(1.0, 32, 32)
    const shellMat = new THREE.MeshPhongMaterial({
      color: 0x7B2FBE,
      emissive: 0x4A0E8F,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.12,
      shininess: 200,
      side: THREE.FrontSide,
    })
    const shellMesh = new THREE.Mesh(shellGeo, shellMat)
    scene.add(shellMesh)

    // Outer glow ring
    const glowGeo = new THREE.SphereGeometry(1.15, 32, 32)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x7B2FBE,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    })
    const glowMesh = new THREE.Mesh(glowGeo, glowMat)
    scene.add(glowMesh)

    // Particle system
    const particleCount = 500
    const positions = new Float32Array(particleCount * 3)
    const particleAngles = new Float32Array(particleCount)
    const particleRadii = new Float32Array(particleCount)
    const particleSpeeds = new Float32Array(particleCount)
    const particleElevations = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      particleAngles[i] = Math.random() * Math.PI * 2
      particleRadii[i] = 1.3 + Math.random() * 0.8
      particleSpeeds[i] = 0.002 + Math.random() * 0.004
      particleElevations[i] = (Math.random() - 0.5) * 2
      positions[i * 3] = Math.cos(particleAngles[i]) * particleRadii[i]
      positions[i * 3 + 1] = particleElevations[i]
      positions[i * 3 + 2] = Math.sin(particleAngles[i]) * particleRadii[i]
    }

    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const particleMat = new THREE.PointsMaterial({
      color: 0xC084FC,
      size: 0.015,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    })

    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x4A0E8F, 0.5)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(0x7B2FBE, 2, 10)
    pointLight1.position.set(2, 2, 2)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xC084FC, 1, 10)
    pointLight2.position.set(-2, -1, 1)
    scene.add(pointLight2)

    sceneRef.current = {
      renderer,
      scene,
      camera,
      coreMesh,
      shellMesh,
      particles,
      animId: 0,
      targetRotX: 0,
      targetRotY: 0,
      currentRotX: 0,
      currentRotY: 0,
      pulsePhase: 0,
      pulseActive: false,
      pulseStartTime: 0,
      baseScale: 1,
    }

    let time = 0

    function animate() {
      sceneRef.current!.animId = requestAnimationFrame(animate)
      time += 0.01

      const state = sceneRef.current!

      // Smooth mouse/gyro rotation
      state.currentRotX += (state.targetRotX - state.currentRotX) * 0.05
      state.currentRotY += (state.targetRotY - state.currentRotY) * 0.05

      // Ambient rotation + mouse tilt
      coreMesh.rotation.y = time * 0.3 + state.currentRotY
      coreMesh.rotation.x = time * 0.1 + state.currentRotX
      wireMesh.rotation.y = -time * 0.2 + state.currentRotY
      wireMesh.rotation.x = state.currentRotX
      shellMesh.rotation.y = time * 0.15
      shellMesh.rotation.x = time * 0.05

      // Sinusoidal glow pulse
      const glowPulse = Math.sin(time * 1.5) * 0.5 + 0.5
      ;(coreMat as THREE.MeshPhongMaterial).emissiveIntensity = 0.4 + glowPulse * 0.4
      ;(shellMat as THREE.MeshPhongMaterial).opacity = 0.08 + glowPulse * 0.08
      pointLight1.intensity = 1.5 + glowPulse * 1.5

      // Pulse animation (scale 1.0 → 1.3 → 1.0)
      if (state.pulseActive) {
        const elapsed = (Date.now() - state.pulseStartTime) / 500
        if (elapsed >= 1) {
          state.pulseActive = false
          coreMesh.scale.setScalar(state.baseScale)
          shellMesh.scale.setScalar(state.baseScale)
          wireMesh.scale.setScalar(state.baseScale)
        } else {
          const pulseScale = state.baseScale + Math.sin(elapsed * Math.PI) * 0.3
          coreMesh.scale.setScalar(pulseScale)
          shellMesh.scale.setScalar(pulseScale)
          wireMesh.scale.setScalar(pulseScale)
        }
      }

      // Animate particles
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < particleCount; i++) {
        particleAngles[i] += particleSpeeds[i]
        const r = particleRadii[i]
        posAttr.setXYZ(
          i,
          Math.cos(particleAngles[i]) * r,
          particleElevations[i] + Math.sin(time * 0.5 + i) * 0.05,
          Math.sin(particleAngles[i]) * r
        )
      }
      posAttr.needsUpdate = true

      renderer.render(scene, camera)
    }

    animate()

    // Resize handler
    function handleResize() {
      if (!container || !sceneRef.current) return
      const w = container.clientWidth
      const h = container.clientHeight
      sceneRef.current.camera.aspect = w / h
      sceneRef.current.camera.updateProjectionMatrix()
      sceneRef.current.renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('deviceorientation', handleDeviceOrientation)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('deviceorientation', handleDeviceOrientation)
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animId)
      }
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [handleMouseMove, handleDeviceOrientation])

  // Handle pulse prop
  useEffect(() => {
    if (pulse && sceneRef.current) {
      sceneRef.current.pulseActive = true
      sceneRef.current.pulseStartTime = Date.now()
    }
  }, [pulse])

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-64 h-64 md:w-80 md:h-80',
    lg: 'w-full h-full',
  }

  return (
    <div
      ref={canvasRef}
      className={`
        ${sizeClasses[size]}
        ${expand ? 'fixed inset-0 w-screen h-screen z-50' : 'relative'}
        ${className}
      `}
      style={{ transition: expand ? 'all 1s ease-in-out' : undefined }}
    />
  )
}
