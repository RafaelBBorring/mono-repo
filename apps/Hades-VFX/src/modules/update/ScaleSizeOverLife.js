import { sampleCurve } from '../../utils/math.js';

export function resolveSizeOverLife(config, normalizedAge) {
  const module = config.particleUpdate.scaleSizeOverLife;
  if (!module || module.enabled === false) return 1;
  return sampleCurve(module.points, normalizedAge);
}
