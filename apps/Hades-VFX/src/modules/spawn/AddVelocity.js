import { normalize3 } from '../../utils/math.js';

export function sampleVelocity(addVelocity) {
  if (addVelocity?.enabled === false) {
    return { x: 0, y: 0, z: 0 };
  }
  const scale = addVelocity.scale;

  switch (addVelocity.mode) {
    case 'cone': {
      const radians = (addVelocity.coneAngle * Math.PI) / 180;
      const phi = Math.random() * radians;
      const theta = Math.random() * Math.PI * 2;
      return {
        x: scale * Math.sin(phi) * Math.cos(theta),
        y: scale * Math.cos(phi),
        z: scale * Math.sin(phi) * Math.sin(theta)
      };
    }
    case 'linear': {
      const direction = addVelocity.direction ?? { x: 0, y: 1, z: 0 };
      const normalized = normalize3(direction.x, direction.y, direction.z);
      return {
        x: normalized.x * scale,
        y: normalized.y * scale,
        z: normalized.z * scale
      };
    }
    case 'random': {
      const normalized = normalize3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
      return {
        x: normalized.x * scale,
        y: normalized.y * scale,
        z: normalized.z * scale
      };
    }
    case 'fromPoint': {
      const point = addVelocity.pointRef ?? { x: 0, y: 0, z: 0 };
      const normalized = normalize3(-point.x, 1 - point.y, -point.z);
      return {
        x: normalized.x * scale,
        y: normalized.y * scale,
        z: normalized.z * scale
      };
    }
    default:
      return { x: 0, y: scale, z: 0 };
  }
}
