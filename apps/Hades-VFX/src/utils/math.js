export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function mixColor(a, b, t) {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
    a: lerp(a.a ?? 1, b.a ?? 1, t)
  };
}

export function hexToRgba(hex, alpha = 1) {
  const safe = hex.replace('#', '');
  return {
    r: parseInt(safe.slice(0, 2), 16) / 255,
    g: parseInt(safe.slice(2, 4), 16) / 255,
    b: parseInt(safe.slice(4, 6), 16) / 255,
    a: alpha
  };
}

export function rgbaToHex(color) {
  return '#' + [color.r, color.g, color.b]
    .map((value) => Math.round(clamp(value, 0, 1) * 255).toString(16).padStart(2, '0'))
    .join('');
}

export function sampleCurve(points, time) {
  if (!points?.length) return 1;
  if (time <= points[0].time) return points[0].value;
  if (time >= points[points.length - 1].time) return points[points.length - 1].value;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    if (time >= start.time && time <= end.time) {
      const localT = (time - start.time) / Math.max(end.time - start.time, 0.0001);
      return lerp(start.value, end.value, localT);
    }
  }

  return 1;
}

export function sampleGradient(stops, time) {
  if (!stops?.length) return { r: 1, g: 1, b: 1, a: 1 };
  if (time <= stops[0].position) return stops[0].color;
  if (time >= stops[stops.length - 1].position) return stops[stops.length - 1].color;

  for (let index = 0; index < stops.length - 1; index += 1) {
    const start = stops[index];
    const end = stops[index + 1];
    if (time >= start.position && time <= end.position) {
      const localT = (time - start.position) / Math.max(end.position - start.position, 0.0001);
      return mixColor(start.color, end.color, localT);
    }
  }

  return stops[stops.length - 1].color;
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function normalize3(x, y, z) {
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

export function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}
