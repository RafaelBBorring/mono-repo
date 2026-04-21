export function applyVortex(config, particle, index, dt) {
  const vortex = config.particleUpdate.vortexForce;
  if (!vortex?.enabled) return;

  const strength = vortex.strength * dt;
  particle.velocityX[index] += -particle.positionZ[index] * strength;
  particle.velocityZ[index] += particle.positionX[index] * strength;
}
