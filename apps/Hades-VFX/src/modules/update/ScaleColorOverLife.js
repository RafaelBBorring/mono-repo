import { sampleGradient } from '../../utils/math.js';

export function resolveColorOverLife(config, normalizedAge) {
  const module = config.particleUpdate.scaleColorOverLife;
  if (!module || module.enabled === false) {
    return config.particleSpawn.initializeParticle.colorStart;
  }
  return sampleGradient(module.stops, normalizedAge);
}
