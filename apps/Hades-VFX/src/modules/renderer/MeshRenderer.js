import * as THREE from 'three';

function createMeshGeometry(meshRef) {
  const normalized = String(meshRef || 'sphere').toLowerCase();

  if (normalized === 'cube' || normalized === 'box') {
    return new THREE.BoxGeometry(1, 1, 1);
  }

  if (normalized === 'cylinder') {
    return new THREE.CylinderGeometry(0.5, 0.5, 1, 12, 1);
  }

  return new THREE.SphereGeometry(0.5, 12, 10);
}

export class MeshRenderer {
  constructor(maxParticles) {
    this.maxParticles = maxParticles;
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.sizes = new Float32Array(maxParticles);
    this.opacities = new Float32Array(maxParticles);

    this.geometry = createMeshGeometry('sphere');
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      metalness: 0,
      roughness: 1,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, maxParticles);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    this._color = new THREE.Color();
    this._tintColor = new THREE.Color(0xffffff);
    this._emissiveColor = new THREE.Color(0xffffff);
    this._dummy = new THREE.Object3D();
    this._lastMeshRef = 'sphere';
    this._useParticleColor = true;
  }

  setMeshType(meshRef) {
    const normalized = String(meshRef || 'sphere').toLowerCase();
    if (normalized === this._lastMeshRef) return;

    const nextGeometry = createMeshGeometry(normalized);
    this.mesh.geometry.dispose();
    this.mesh.geometry = nextGeometry;
    this.geometry = nextGeometry;
    this._lastMeshRef = normalized;
  }

  setBlendMode(mode) {
    const modeMap = {
      additive: THREE.AdditiveBlending,
      translucent: THREE.NormalBlending,
      normal: THREE.NormalBlending,
      opaque: THREE.NoBlending,
      multiply: THREE.MultiplyBlending
    };

    this.material.blending = modeMap[mode] ?? THREE.NormalBlending;
    this.material.transparent = mode !== 'opaque';
    this.material.depthWrite = mode === 'opaque';
    this.material.needsUpdate = true;
  }

  setEmissiveIntensity(value) {
    this.material.emissiveIntensity = Math.max(value ?? 1, 0);
    this.material.needsUpdate = true;
  }

  setTintColor(color) {
    const safe = color ?? { r: 1, g: 1, b: 1 };
    this._tintColor.setRGB(safe.r ?? 1, safe.g ?? 1, safe.b ?? 1);
    this.material.color.copy(this._tintColor);
  }

  setEmissiveColor(color) {
    const safe = color ?? { r: 1, g: 1, b: 1 };
    this._emissiveColor.setRGB(safe.r ?? 1, safe.g ?? 1, safe.b ?? 1);
    this.material.emissive.copy(this._emissiveColor);
  }

  setUseParticleColor(value) {
    this._useParticleColor = value !== false;
  }

  sync(drawCount) {
    for (let index = 0; index < drawCount; index += 1) {
      const offset = index * 3;
      const size = Math.max(this.sizes[index], 0.0001);
      const opacity = this.opacities[index] ?? 1;

      this._dummy.position.set(this.positions[offset], this.positions[offset + 1], this.positions[offset + 2]);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.setScalar(size);
      this._dummy.updateMatrix();
      this.mesh.setMatrixAt(index, this._dummy.matrix);

      if (this._useParticleColor) {
        this._color.setRGB(
          this.colors[offset] * opacity,
          this.colors[offset + 1] * opacity,
          this.colors[offset + 2] * opacity
        );
      } else {
        this._color.copy(this._tintColor).multiplyScalar(opacity);
      }
      this.mesh.setColorAt(index, this._color);
    }

    this.mesh.count = drawCount;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
