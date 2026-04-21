import { curlNoise } from '../../utils/noise.js';

export function applyCurlNoise(config, particle, index, dt) {
  const curl = config.particleUpdate.curlNoise;
  if (!curl?.enabled) return;

  const sample = curlNoise(
    particle.positionX[index] * curl.scale * curl.frequency,
    particle.positionY[index] * curl.scale * curl.frequency,
    particle.positionZ[index] * curl.scale * curl.frequency
  );

  particle.velocityX[index] += sample.x * curl.strength * dt;
  particle.velocityY[index] += sample.y * curl.strength * dt;
  particle.velocityZ[index] += sample.z * curl.strength * dt;
}
