varying vec3 vColor;
varying float vOpacity;
uniform float uEmissiveIntensity;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;

  float core = 1.0 - smoothstep(0.0, 0.22, dist);
  float glow = 1.0 - smoothstep(0.0, 0.5, dist);
  float alpha = (glow * 0.85 + core * 0.15) * vOpacity;
  vec3 color = vColor * (1.0 + core * 1.8) * uEmissiveIntensity;
  gl_FragColor = vec4(color, alpha);
}
