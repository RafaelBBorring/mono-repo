attribute vec3 aColor;
attribute float aSize;
attribute float aOpacity;

varying vec3 vColor;
varying float vOpacity;

void main() {
  vColor = aColor;
  vOpacity = aOpacity;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * (700.0 / -mvPosition.z), 1.0, 180.0);
  gl_Position = projectionMatrix * mvPosition;
}
