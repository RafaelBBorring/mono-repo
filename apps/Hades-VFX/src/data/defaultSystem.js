export function createDefaultSystem() {
  return {
    hadesVersion: '0.1.0-alpha',
    system: {
      name: 'HADES_System_01',
      tags: ['prototype', 'fire', 'magic'],
      emitters: [
        {
          id: 'emitter-01',
          name: 'Emitter_01',
          colorTag: '#e8622a',
          enabled: true,
          simulationTarget: 'CPU',
          emitterTransform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          emitterSpawn: {
            loop: true,
            duration: 5,
            delay: 0,
            loopCount: 0
          },
          emitterUpdate: {
            spawnRate: 65,
            burstSpawn: [{ count: 50, time: 0.1 }],
            emitterState: 'Infinite'
          },
          particleSpawn: {
            initializeParticle: {
              enabled: true,
              lifetimeMin: 1.4,
              lifetimeMax: 2.8,
              colorStart: { r: 1, g: 0.62, b: 0.15, a: 1 },
              colorEnd: { r: 1, g: 0.12, b: 0.05, a: 0 },
              mass: 1,
              sizeMin: 0.08,
              sizeMax: 0.22,
              rotationMin: 0,
              rotationMax: 0
            },
            shapeLocation: {
              enabled: true,
              type: 'cone',
              radius: 0.6,
              dimensions: { x: 1.2, y: 2, z: 1.2 },
              surfaceOnly: false,
              meshSampling: { enabled: false, meshRef: '', mode: 'surface' }
            },
            addVelocity: {
              enabled: true,
              mode: 'cone',
              scale: 3.2,
              coneAngle: 28,
              direction: { x: 0, y: 1, z: 0 },
              pointRef: { x: 0, y: 0, z: 0 }
            },
            spawnAtLocation: { x: 0, y: 0, z: 0 }
          },
          particleUpdate: {
            particleState: { enabled: true, killOnLifetimeEnd: true },
            gravityForce: { enabled: true, x: 0, y: -1.2, z: 0 },
            drag: { enabled: true, coefficient: 0.38 },
            vortexForce: { enabled: false, strength: 1.2, axis: { x: 0, y: 1, z: 0 } },
            curlNoise: { enabled: true, scale: 0.8, strength: 1.7, frequency: 0.55 },
            pointAttraction: { enabled: false, position: { x: 0, y: 2, z: 0 }, strength: 2.5, falloff: 3.5 },
            turbulence: { enabled: false, intensity: 1.5, frequency: 0.9 },
            collision: { enabled: true, mode: 'plane', restitution: 0.2, friction: 0.3 },
            scaleColorOverLife: { enabled: true,
              stops: [
                { position: 0, color: { r: 1, g: 0.62, b: 0.15, a: 1 } },
                { position: 0.5, color: { r: 1, g: 0.32, b: 0.08, a: 0.9 } },
                { position: 1, color: { r: 0.18, g: 0.06, b: 0.35, a: 0 } }
              ]
            },
            scaleSizeOverLife: { enabled: true,
              points: [
                { time: 0, value: 0.65 },
                { time: 0.3, value: 1.15 },
                { time: 1, value: 0.15 }
              ]
            },
            rotationRate: 0,
            solver: 'euler',
            maxVelocity: 30,
            substeps: 2
          },
          renderer: {
            type: 'sprite',
            blendMode: 'additive',
            sortMode: 'none',
            emissiveIntensity: 1.8,
            materialTexture: '',
            subUV: { rows: 1, cols: 1, frameRate: 0 },
            softParticles: false,
            facingMode: 'camera',
            spriteRenderer: {
              enabled: true,
              materialTexture: '',
              alignment: 'camera',
              blendingMode: 'additive'
            },
            meshRenderer: {
              enabled: false,
              meshRef: 'sphere',
              useParticleColor: true,
              baseColor: { r: 1, g: 0.62, b: 0.15, a: 1 },
              emissiveColor: { r: 1, g: 0.62, b: 0.15, a: 1 },
              overrideMaterial: false,
              overrideMaterialName: '',
              emissiveIntensity: 1.8
            }
          }
        },
        {
          id: 'emitter-02',
          name: 'Emitter_02',
          colorTag: '#4a9eff',
          enabled: true,
          simulationTarget: 'CPU',
          emitterTransform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          emitterSpawn: {
            loop: true,
            duration: 7,
            delay: 0.3,
            loopCount: 0
          },
          emitterUpdate: {
            spawnRate: 28,
            burstSpawn: [{ count: 20, time: 0.5 }],
            emitterState: 'Infinite'
          },
          particleSpawn: {
            initializeParticle: {
              enabled: true,
              lifetimeMin: 2.2,
              lifetimeMax: 4.2,
              colorStart: { r: 0.12, g: 0.5, b: 1, a: 1 },
              colorEnd: { r: 0.62, g: 0.1, b: 1, a: 0 },
              mass: 1,
              sizeMin: 0.1,
              sizeMax: 0.18,
              rotationMin: 0,
              rotationMax: 0
            },
            shapeLocation: {
              enabled: true,
              type: 'sphere',
              radius: 0.35,
              dimensions: { x: 0.7, y: 0.7, z: 0.7 },
              surfaceOnly: false,
              meshSampling: { enabled: false, meshRef: '', mode: 'surface' }
            },
            addVelocity: {
              enabled: true,
              mode: 'linear',
              scale: 2.4,
              coneAngle: 25,
              direction: { x: 0, y: 1, z: 0 },
              pointRef: { x: 0, y: 0, z: 0 }
            },
            spawnAtLocation: { x: 0, y: 0, z: 0 }
          },
          particleUpdate: {
            particleState: { enabled: true, killOnLifetimeEnd: true },
            gravityForce: { enabled: true, x: 0, y: -0.35, z: 0 },
            drag: { enabled: true, coefficient: 0.18 },
            vortexForce: { enabled: true, strength: 0.9, axis: { x: 0, y: 1, z: 0 } },
            curlNoise: { enabled: false, scale: 1, strength: 2, frequency: 0.5 },
            pointAttraction: { enabled: true, position: { x: 0, y: 1.5, z: 0 }, strength: 1.1, falloff: 4.2 },
            turbulence: { enabled: false, intensity: 1.1, frequency: 0.6 },
            collision: { enabled: false, mode: 'plane', restitution: 0.2, friction: 0.3 },
            scaleColorOverLife: { enabled: true,
              stops: [
                { position: 0, color: { r: 0.12, g: 0.5, b: 1, a: 1 } },
                { position: 1, color: { r: 0.62, g: 0.1, b: 1, a: 0 } }
              ]
            },
            scaleSizeOverLife: { enabled: true,
              points: [
                { time: 0, value: 0.9 },
                { time: 0.75, value: 1.2 },
                { time: 1, value: 0.25 }
              ]
            },
            rotationRate: 0,
            solver: 'euler',
            maxVelocity: 24,
            substeps: 1
          },
          renderer: {
            type: 'sprite',
            blendMode: 'translucent',
            sortMode: 'byDistance',
            emissiveIntensity: 1.4,
            materialTexture: '',
            subUV: { rows: 1, cols: 1, frameRate: 0 },
            softParticles: false,
            facingMode: 'camera',
            spriteRenderer: {
              enabled: true,
              materialTexture: '',
              alignment: 'camera',
              blendingMode: 'translucent'
            },
            meshRenderer: {
              enabled: false,
              meshRef: 'sphere',
              useParticleColor: true,
              baseColor: { r: 0.12, g: 0.5, b: 1, a: 1 },
              emissiveColor: { r: 0.12, g: 0.5, b: 1, a: 1 },
              overrideMaterial: false,
              overrideMaterialName: '',
              emissiveIntensity: 1.4
            }
          }
        }
      ]
    }
  };
}
