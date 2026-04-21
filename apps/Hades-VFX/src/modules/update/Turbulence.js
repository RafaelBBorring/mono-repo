export function applyTurbulence(config, particle, index, dt) {
  const turbulence = config.particleUpdate.turbulence;
  if (!turbulence?.enabled) return;

  const wave = Math.sin((particle.age[index] + particle.positionX[index]) * turbulence.frequency);
  const wave2 = Math.cos((particle.age[index] + particle.positionZ[index]) * turbulence.frequency);
  particle.velocityX[index] += wave * turbulence.intensity * dt;
  particle.velocityY[index] += Math.sin(particle.age[index] * turbulence.frequency) * turbulence.intensity * 0.35 * dt;
  particle.velocityZ[index] += wave2 * turbulence.intensity * dt;
}
