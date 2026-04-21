export function sampleShapeLocation(shapeLocation) {
  if (shapeLocation?.enabled === false) {
    return { x: 0, y: 0, z: 0 };
  }
  const radius = shapeLocation.radius;

  switch (shapeLocation.type) {
    case 'sphere': {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const rr = shapeLocation.surfaceOnly ? radius : radius * Math.cbrt(Math.random());
      return {
        x: rr * Math.sin(phi) * Math.cos(theta),
        y: rr * Math.cos(phi),
        z: rr * Math.sin(phi) * Math.sin(theta)
      };
    }
    case 'cylinder': {
      const angle = Math.random() * Math.PI * 2;
      const rr = shapeLocation.surfaceOnly ? radius : radius * Math.sqrt(Math.random());
      return {
        x: rr * Math.cos(angle),
        y: (Math.random() - 0.5) * 2,
        z: rr * Math.sin(angle)
      };
    }
    case 'box':
      return {
        x: (Math.random() - 0.5) * (shapeLocation.dimensions?.x ?? radius * 2),
        y: (Math.random() - 0.5) * (shapeLocation.dimensions?.y ?? radius * 2),
        z: (Math.random() - 0.5) * (shapeLocation.dimensions?.z ?? radius * 2)
      };
    case 'cone': {
      const t = Math.random();
      const angle = Math.random() * Math.PI * 2;
      return {
        x: t * radius * Math.cos(angle),
        y: t * 2,
        z: t * radius * Math.sin(angle)
      };
    }
    default:
      return { x: 0, y: 0, z: 0 };
  }
}
