import * as THREE from "three";

// Adapted from the user-provided magic-plasma-sphere-three-js archive.
// JARVIS uses a warm gold palette, no GUI, and no camera/zoom controls.
const host = document.getElementById("jarvisView");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
camera.position.set(0, 0, 3.3);

const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: "low-power" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.15));
renderer.setClearColor(0x000000, 1);
renderer.domElement.className = "plasma-canvas";
renderer.domElement.setAttribute("aria-hidden", "true");
host.append(renderer.domElement);

const core = new THREE.Group();
scene.add(core);

const plasmaMaterial = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying vec3 vPosition;
    varying vec3 vNormal;
    void main() {
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vPosition;
    varying vec3 vNormal;
    float hash31(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float noise3(vec3 p) {
      vec3 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x),
                      mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
                      mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
      float v = 0.0, a = 0.52;
      for (int i = 0; i < 4; i++) { v += noise3(p) * a; p *= 2.03; a *= 0.5; }
      return v;
    }
    void main() {
      vec3 p = vPosition * 4.4;
      float cloud = fbm(p + vec3(uTime * 0.15, -uTime * 0.08, uTime * 0.11));
      float veins = fbm(p * 1.6 + vec3(3.0, 1.0, 5.0) - uTime * 0.12);
      float field = cloud * 0.62 + veins * 0.38;
      float flame = smoothstep(0.37, 0.82, field);
      float facing = max(0.0, dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
      vec3 deep = vec3(0.18, 0.035, 0.004);
      vec3 amber = vec3(1.0, 0.24, 0.015);
      vec3 gold = vec3(1.0, 0.70, 0.10);
      vec3 hot = vec3(1.0, 0.96, 0.62);
      vec3 color = mix(deep, amber, smoothstep(0.18, 0.48, field));
      color = mix(color, gold, smoothstep(0.48, 0.70, field));
      color = mix(color, hot, flame * 0.8);
      float edge = pow(1.0 - facing, 2.2);
      color += vec3(1.0, 0.32, 0.025) * edge * 0.65;
      float alpha = 0.32 + flame * 0.64;
      gl_FragColor = vec4(color * (0.72 + facing * 0.5), alpha);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const plasma = new THREE.Mesh(new THREE.SphereGeometry(0.91, 72, 56), plasmaMaterial);
core.add(plasma);

const shellMaterial = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(0xff970c) } },
  vertexShader: `varying vec3 n; varying vec3 v; void main(){ n=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); v=-mv.xyz; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uColor; varying vec3 n; varying vec3 v; void main(){ float edge=pow(1.0-max(0.0,dot(normalize(n),normalize(v))),2.4); gl_FragColor=vec4(uColor,edge*0.48); }`,
  transparent: true,
  blending: THREE.AdditiveBlending,
  side: THREE.FrontSide,
  depthWrite: false,
});
core.add(new THREE.Mesh(new THREE.SphereGeometry(0.94, 64, 48), shellMaterial));

const glowMaterial = new THREE.ShaderMaterial({
  vertexShader: `varying vec3 p; void main(){ p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `varying vec3 p; void main(){ float a=pow(max(0.0,1.0-length(p)),3.0)*0.26; gl_FragColor=vec4(1.0,0.24,0.015,a); }`,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.BackSide,
});
const glow = new THREE.Mesh(new THREE.SphereGeometry(1.12, 40, 32), glowMaterial);
core.add(glow);

const particleCount = 720;
const positions = new Float32Array(particleCount * 3);
const sizes = new Float32Array(particleCount);
for (let i = 0; i < particleCount; i += 1) {
  const y = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const r = 1.02 + Math.random() * 0.42;
  const ring = Math.sqrt(1 - y * y);
  positions[i * 3] = Math.cos(a) * ring * r;
  positions[i * 3 + 1] = y * r;
  positions[i * 3 + 2] = Math.sin(a) * ring * r;
  sizes[i] = 0.45 + Math.random() * 1.8;
}
const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
particleGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
const particleMaterial = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `uniform float uTime; attribute float aSize; varying float alpha; void main(){ vec3 p=position; p.x+=sin(uTime*0.22+p.y*4.0)*0.018; p.y+=cos(uTime*0.18+p.z*4.0)*0.018; vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=(aSize*5.0)/-mv.z; alpha=0.55+0.45*sin(uTime*1.7+aSize*6.0); }`,
  fragmentShader: `varying float alpha; void main(){ float d=length(gl_PointCoord-0.5); if(d>0.5) discard; float glow=pow(1.0-d*2.0,2.0); gl_FragColor=vec4(1.0,0.68+glow*0.24,0.12,glow*alpha); }`,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
core.add(new THREE.Points(particleGeometry, particleMaterial));

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let running = false;
let frame = 0;
let lastFrame = 0;
const clock = new THREE.Clock();

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function render(time) {
  frame = 0;
  if (!running || document.hidden || !document.body.classList.contains("jarvis-open")) return;
  if (time - lastFrame < 1000 / 30) { frame = requestAnimationFrame(render); return; }
  lastFrame = time;
  const t = clock.getElapsedTime();
  plasmaMaterial.uniforms.uTime.value = t;
  particleMaterial.uniforms.uTime.value = t;
  if (!reducedMotion.matches) {
    core.rotation.y = t * 0.16;
    core.rotation.x = Math.sin(t * 0.19) * 0.12;
  }
  renderer.render(scene, camera);
  if (!reducedMotion.matches) frame = requestAnimationFrame(render);
}

function start() {
  resize();
  running = true;
  if (!frame) frame = requestAnimationFrame(render);
}
function stop() {
  running = false;
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

window.MotherPlasmaSphere = { start, stop };
window.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => document.hidden ? stop() : (document.body.classList.contains("jarvis-open") && start()));
reducedMotion.addEventListener("change", () => { if (document.body.classList.contains("jarvis-open")) { stop(); start(); } });
if (document.body.classList.contains("jarvis-open")) start();
