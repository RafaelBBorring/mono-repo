import * as THREE from 'three';
import vertexShader from '../../shaders/particle.vert.glsl?raw';
import fragmentShader from '../../shaders/particle.frag.glsl?raw';

export class SpriteRenderer {
  constructor(maxParticles) {
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.sizes = new Float32Array(maxParticles);
    this.opacities = new Float32Array(maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.opacities, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uEmissiveIntensity: { value: 1 }
      }
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  setBlendMode(mode) {
    const modeMap = {
      additive: THREE.AdditiveBlending,
      normal: THREE.NormalBlending,
      translucent: THREE.NormalBlending,
      opaque: THREE.NoBlending,
      multiply: THREE.MultiplyBlending
    };
    this.material.blending = modeMap[mode] ?? THREE.AdditiveBlending;
    this.material.transparent = mode !== 'opaque';
    this.material.needsUpdate = true;
  }

  setEmissiveIntensity(value) {
    this.material.uniforms.uEmissiveIntensity.value = value;
  }

  sync(drawCount) {
    this.geometry.setDrawRange(0, drawCount);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aOpacity.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
