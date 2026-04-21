export function applyGravity(config, particle, index, dt) {
  const gravity = config.particleUpdate.gravityForce;
  if (!gravity || gravity.enabled === false) return;
  particle.velocityX[index] += gravity.x * dt;
  particle.velocityY[index] += gravity.y * dt;
  particle.velocityZ[index] += gravity.z * dt;
}
