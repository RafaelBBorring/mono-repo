import { randomRange } from '../../utils/math.js';

export function initializeParticle(emitterConfig, particle, particleIndex) {
  const settings = emitterConfig.particleSpawn.initializeParticle;
  if (settings?.enabled === false) return;
  particle.age[particleIndex] = 0;
  particle.maxAge[particleIndex] = randomRange(settings.lifetimeMin, settings.lifetimeMax);
  particle.size[particleIndex] = randomRange(settings.sizeMin, settings.sizeMax);
  particle.rotation[particleIndex] = randomRange(settings.rotationMin ?? 0, settings.rotationMax ?? 0);
  particle.mass[particleIndex] = settings.mass;
}
