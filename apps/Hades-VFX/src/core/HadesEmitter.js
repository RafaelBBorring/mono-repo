import { initializeParticle } from '../modules/spawn/InitializeParticle.js';
import { sampleShapeLocation } from '../modules/spawn/ShapeLocation.js';
import { sampleVelocity } from '../modules/spawn/AddVelocity.js';
import { applyGravity } from '../modules/update/GravityForce.js';
import { applyDrag } from '../modules/update/Drag.js';
import { applyVortex } from '../modules/update/VortexForce.js';
import { applyCurlNoise } from '../modules/update/CurlNoise.js';
import { applyPointAttraction } from '../modules/update/PointAttraction.js';
import { applyTurbulence } from '../modules/update/Turbulence.js';
import { resolveColorOverLife } from '../modules/update/ScaleColorOverLife.js';
import { resolveSizeOverLife } from '../modules/update/ScaleSizeOverLife.js';
import { solveForces } from '../modules/update/SolveForcesAndVelocity.js';
import { SpriteRenderer } from '../modules/renderer/SpriteRenderer.js';
import { MeshRenderer } from '../modules/renderer/MeshRenderer.js';
import * as THREE from 'three';
import { cloneData, clamp } from '../utils/math.js';

const MAX_PARTICLES = 10000;

export class HadesEmitter {
  constructor(config) {
    this.maxParticles = MAX_PARTICLES;
    this.config = cloneData(config);
    this.spawnAccumulator = 0;
    this.systemTime = 0;
    this.liveCount = 0;
    this.pendingBursts = new Set();

    this.alive = new Uint8Array(MAX_PARTICLES);
    this.age = new Float32Array(MAX_PARTICLES);
    this.maxAge = new Float32Array(MAX_PARTICLES);
    this.positionX = new Float32Array(MAX_PARTICLES);
    this.positionY = new Float32Array(MAX_PARTICLES);
    this.positionZ = new Float32Array(MAX_PARTICLES);
    this.velocityX = new Float32Array(MAX_PARTICLES);
    this.velocityY = new Float32Array(MAX_PARTICLES);
    this.velocityZ = new Float32Array(MAX_PARTICLES);
    this.size = new Float32Array(MAX_PARTICLES);
    this.baseSize = new Float32Array(MAX_PARTICLES);
    this.opacity = new Float32Array(MAX_PARTICLES);
    this.mass = new Float32Array(MAX_PARTICLES);
    this.rotation = new Float32Array(MAX_PARTICLES);

    this.group = new THREE.Group();
    this.spriteRenderer = new SpriteRenderer(MAX_PARTICLES);
    this.meshRenderer = new MeshRenderer(MAX_PARTICLES);
    this.group.add(this.spriteRenderer.points);
    this.group.add(this.meshRenderer.mesh);
    this.syncRendererConfig();
    this.syncTransformConfig();

    this.freeList = [];
    for (let index = MAX_PARTICLES - 1; index >= 0; index -= 1) {
      this.freeList.push(index);
    }
  }

  get points() {
    return this.group;
  }

  get enabled() {
    return this.config.enabled;
  }

  set enabled(value) {
    this.config.enabled = value;
    this.group.visible = value;
  }

  updateConfig(nextConfig) {
    this.config = cloneData(nextConfig);
    this.syncRendererConfig();
    this.syncTransformConfig();
  }

  syncRendererConfig() {
    const blendMode = this.config.renderer.blendMode;
    const emissiveIntensity = this.config.renderer.emissiveIntensity ?? 1;
    const meshConfig = this.config.renderer.meshRenderer ?? {};
    const meshRef = meshConfig.meshRef || 'sphere';
    const activeType = this.config.renderer.type;
    const spriteEnabled = this.config.renderer.spriteRenderer?.enabled !== false;
    const meshEnabled = meshConfig.enabled !== false;
    const useMeshRenderer = activeType === 'mesh' && meshEnabled;

    this.spriteRenderer.setBlendMode(blendMode);
    this.spriteRenderer.setEmissiveIntensity(emissiveIntensity);

    this.meshRenderer.setBlendMode(blendMode);
    this.meshRenderer.setEmissiveIntensity(meshConfig.emissiveIntensity ?? emissiveIntensity);
    this.meshRenderer.setMeshType(meshRef);
    this.meshRenderer.setUseParticleColor(meshConfig.useParticleColor);
    this.meshRenderer.setTintColor(meshConfig.baseColor ?? this.config.particleSpawn.initializeParticle.colorStart);
    this.meshRenderer.setEmissiveColor(meshConfig.emissiveColor ?? meshConfig.baseColor ?? this.config.particleSpawn.initializeParticle.colorStart);

    this.group.visible = this.config.enabled !== false;
    this.spriteRenderer.points.visible = spriteEnabled && !useMeshRenderer;
    this.meshRenderer.mesh.visible = useMeshRenderer;
  }

  syncTransformConfig() {
    const transform = this.config.emitterTransform ?? {};
    const position = transform.position ?? { x: 0, y: 0, z: 0 };
    const rotation = transform.rotation ?? { x: 0, y: 0, z: 0 };
    const scale = transform.scale ?? { x: 1, y: 1, z: 1 };

    this.group.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
    this.group.rotation.set(
      THREE.MathUtils.degToRad(rotation.x ?? 0),
      THREE.MathUtils.degToRad(rotation.y ?? 0),
      THREE.MathUtils.degToRad(rotation.z ?? 0)
    );
    this.group.scale.set(
      Math.max(scale.x ?? 1, 0.001),
      Math.max(scale.y ?? 1, 0.001),
      Math.max(scale.z ?? 1, 0.001)
    );
    this.group.updateMatrixWorld(true);
  }

  spawnOne() {
    if (!this.freeList.length) return;
    const index = this.freeList.pop();
    this.alive[index] = 1;
    initializeParticle(this.config, this, index);

    const location = sampleShapeLocation(this.config.particleSpawn.shapeLocation);
    const offset = this.config.particleSpawn.spawnAtLocation ?? { x: 0, y: 0, z: 0 };
    this.positionX[index] = location.x + offset.x;
    this.positionY[index] = location.y + offset.y;
    this.positionZ[index] = location.z + offset.z;

    const velocity = sampleVelocity(this.config.particleSpawn.addVelocity);
    this.velocityX[index] = velocity.x;
    this.velocityY[index] = velocity.y;
    this.velocityZ[index] = velocity.z;
    this.baseSize[index] = this.size[index];
    this.opacity[index] = 1;
    this.liveCount += 1;
  }

  reset() {
    this.alive.fill(0);
    this.age.fill(0);
    this.liveCount = 0;
    this.spawnAccumulator = 0;
    this.systemTime = 0;
    this.pendingBursts.clear();
    this.freeList = [];
    for (let index = this.maxParticles - 1; index >= 0; index -= 1) {
      this.freeList.push(index);
    }
    this.spriteRenderer.sync(0);
    this.meshRenderer.sync(0);
  }

  update(dt) {
    if (!this.config.enabled || this.config.emitterUpdate.emitterState === 'Inactive') {
      this.syncActiveRenderer(this.liveCount);
      return;
    }

    this.systemTime += dt;
    this.runSpawning(dt);
    this.runParticles(dt);
  }

  runSpawning(dt) {
    const spawn = this.config.emitterSpawn;
    if (this.systemTime < spawn.delay) return;

    const localTime = this.systemTime - spawn.delay;
    const stateMode = this.config.emitterUpdate.emitterState;
    const withinDuration = stateMode === 'Infinite' || stateMode === 'Looping' || localTime <= spawn.duration;
    if (!withinDuration) return;

    this.spawnAccumulator += this.config.emitterUpdate.spawnRate * dt;
    while (this.spawnAccumulator >= 1 && this.liveCount < this.maxParticles) {
      this.spawnOne();
      this.spawnAccumulator -= 1;
    }

    const bursts = this.config.emitterUpdate.burstSpawn ?? [];
    bursts.forEach((burst, index) => {
      const burstKey = `${Math.floor(localTime / Math.max(spawn.duration || 1, 0.0001))}-${index}`;
      if (localTime >= burst.time && !this.pendingBursts.has(burstKey)) {
        for (let count = 0; count < burst.count && this.liveCount < this.maxParticles; count += 1) {
          this.spawnOne();
        }
        this.pendingBursts.add(burstKey);
      }
    });
  }

  runParticles(dt) {
    const substeps = this.config.particleUpdate.substeps ?? 1;
    const stepDt = dt / substeps;
    let drawCount = 0;

    for (let index = 0; index < this.maxParticles; index += 1) {
      if (!this.alive[index]) continue;

      for (let step = 0; step < substeps; step += 1) {
        this.age[index] += stepDt;
        if (this.age[index] >= this.maxAge[index]) {
          break;
        }

        applyGravity(this.config, this, index, stepDt);
        applyDrag(this.config, this, index, stepDt);
        applyVortex(this.config, this, index, stepDt);
        applyCurlNoise(this.config, this, index, stepDt);
        applyPointAttraction(this.config, this, index, stepDt);
        applyTurbulence(this.config, this, index, stepDt);
        solveForces(this.config, this, index, stepDt);
      }

      const particleState = this.config.particleUpdate.particleState;
      if ((particleState?.killOnLifetimeEnd ?? true) && this.age[index] >= this.maxAge[index]) {
        this.alive[index] = 0;
        this.freeList.push(index);
        this.liveCount -= 1;
        continue;
      }

      const normalizedAge = clamp(this.age[index] / Math.max(this.maxAge[index], 0.0001), 0, 1);
      const color = resolveColorOverLife(this.config, normalizedAge);
      const sizeScale = resolveSizeOverLife(this.config, normalizedAge);
      const opacity = color.a ?? this.opacity[index];
      const arrayIndex = drawCount * 3;

      this.writeRenderData(this.spriteRenderer, arrayIndex, drawCount, color, sizeScale, opacity, index);
      this.writeRenderData(this.meshRenderer, arrayIndex, drawCount, color, sizeScale, opacity, index);
      drawCount += 1;
    }

    this.syncActiveRenderer(drawCount);
  }

  writeRenderData(renderer, arrayIndex, drawCount, color, sizeScale, opacity, particleIndex) {
    renderer.positions[arrayIndex] = this.positionX[particleIndex];
    renderer.positions[arrayIndex + 1] = this.positionY[particleIndex];
    renderer.positions[arrayIndex + 2] = this.positionZ[particleIndex];
    renderer.colors[arrayIndex] = color.r;
    renderer.colors[arrayIndex + 1] = color.g;
    renderer.colors[arrayIndex + 2] = color.b;
    renderer.sizes[drawCount] = this.baseSize[particleIndex] * sizeScale * 20;
    renderer.opacities[drawCount] = opacity;
  }

  syncActiveRenderer(drawCount) {
    if (this.config.renderer.type === 'mesh') {
      this.spriteRenderer.sync(0);
      this.meshRenderer.sync(drawCount);
      return;
    }

    this.meshRenderer.sync(0);
    this.spriteRenderer.sync(drawCount);
  }

  toJSON() {
    return cloneData(this.config);
  }

  dispose() {
    this.spriteRenderer.dispose();
    this.meshRenderer.dispose();
  }
}
