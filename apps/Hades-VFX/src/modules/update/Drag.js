export function applyDrag(config, particle, index, dt) {
  const drag = config.particleUpdate.drag;
  if (!drag || drag.enabled === false) return;
  const damping = Math.max(0, 1 - drag.coefficient * dt);
  particle.velocityX[index] *= damping;
  particle.velocityY[index] *= damping;
  particle.velocityZ[index] *= damping;
}
