// Subtle red/blue drift across the screen for a dreamy look
export const ColorShiftShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    amount: { value: 0.02 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      col.r += amount * sin(time + vUv.y * 10.0);
      col.b += amount * cos(time + vUv.x * 10.0);
      gl_FragColor = vec4(col, 1.0);
    }`,
};
