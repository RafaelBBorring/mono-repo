import { clamp } from '../../utils/math.js';

export function solveForces(config, particle, index, dt) {
  particle.positionX[index] += particle.velocityX[index] * dt;
  particle.positionY[index] += particle.velocityY[index] * dt;
  particle.positionZ[index] += particle.velocityZ[index] * dt;

  const collision = config.particleUpdate.collision;
  if (collision?.enabled && collision.mode === 'plane' && particle.positionY[index] < 0) {
    particle.positionY[index] = 0;
    particle.velocityY[index] = -particle.velocityY[index] * collision.restitution;
    particle.velocityX[index] *= 1 - collision.friction;
    particle.velocityZ[index] *= 1 - collision.friction;
  }

  const maxVelocity = config.particleUpdate.maxVelocity ?? 999;
  const speed = Math.hypot(particle.velocityX[index], particle.velocityY[index], particle.velocityZ[index]);
  if (speed > maxVelocity) {
    const ratio = maxVelocity / speed;
    particle.velocityX[index] *= ratio;
    particle.velocityY[index] *= ratio;
    particle.velocityZ[index] *= ratio;
  }

  particle.opacity[index] = clamp(1 - normalizedLifeSquared(particle.age[index], particle.maxAge[index]), 0, 1);
}

function normalizedLifeSquared(age, maxAge) {
  const t = clamp(age / Math.max(maxAge, 0.0001), 0, 1);
  return t * t;
}
