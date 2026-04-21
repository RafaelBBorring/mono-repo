import { clamp } from '../../utils/math.js';

export function applyPointAttraction(config, particle, index, dt) {
  const attraction = config.particleUpdate.pointAttraction;
  if (!attraction?.enabled) return;

  const dx = attraction.position.x - particle.positionX[index];
  const dy = attraction.position.y - particle.positionY[index];
  const dz = attraction.position.z - particle.positionZ[index];
  const distance = Math.hypot(dx, dy, dz) || 0.0001;
  const falloff = 1 - clamp(distance / Math.max(attraction.falloff, 0.0001), 0, 1);
  const strength = (attraction.strength * falloff * dt) / distance;

  particle.velocityX[index] += dx * strength;
  particle.velocityY[index] += dy * strength;
  particle.velocityZ[index] += dz * strength;
}
