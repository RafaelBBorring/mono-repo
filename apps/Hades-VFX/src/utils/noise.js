function hash(n) {
  return (Math.sin(n * 127.1) * 43758.5453123) % 1;
}

function noise3(x, y, z) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const n000 = hash(ix + iy * 57 + iz * 131);
  const n100 = hash(ix + 1 + iy * 57 + iz * 131);
  const n010 = hash(ix + (iy + 1) * 57 + iz * 131);
  const n110 = hash(ix + 1 + (iy + 1) * 57 + iz * 131);
  const n001 = hash(ix + iy * 57 + (iz + 1) * 131);
  const n101 = hash(ix + 1 + iy * 57 + (iz + 1) * 131);
  const n011 = hash(ix + (iy + 1) * 57 + (iz + 1) * 131);
  const n111 = hash(ix + 1 + (iy + 1) * 57 + (iz + 1) * 131);

  return (
    n000 * (1 - ux) * (1 - uy) * (1 - uz) +
    n100 * ux * (1 - uy) * (1 - uz) +
    n010 * (1 - ux) * uy * (1 - uz) +
    n110 * ux * uy * (1 - uz) +
    n001 * (1 - ux) * (1 - uy) * uz +
    n101 * ux * (1 - uy) * uz +
    n011 * (1 - ux) * uy * uz +
    n111 * ux * uy * uz
  );
}

export function curlNoise(x, y, z, epsilon = 0.01) {
  const dFxY = (noise3(x, y + epsilon, z) - noise3(x, y - epsilon, z)) / (2 * epsilon);
  const dFxZ = (noise3(x, y, z + epsilon) - noise3(x, y, z - epsilon)) / (2 * epsilon);
  const dFyX = (noise3(x + epsilon, y, z) - noise3(x - epsilon, y, z)) / (2 * epsilon);
  const dFyZ = (noise3(x, y, z + epsilon) - noise3(x, y, z - epsilon)) / (2 * epsilon);
  const dFzX = (noise3(x + epsilon, y, z) - noise3(x - epsilon, y, z)) / (2 * epsilon);
  const dFzY = (noise3(x, y + epsilon, z) - noise3(x, y - epsilon, z)) / (2 * epsilon);

  return {
    x: dFxY - dFyZ,
    y: dFyX - dFzX,
    z: dFzY - dFxZ
  };
}
