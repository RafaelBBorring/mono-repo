import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/shaders/GammaCorrectionShader.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { sceneConfig as config } from './sceneConfig.js';

// ── DOM refs ────────────────────────────────────────────
const canvas          = document.getElementById('canvas');
const loadingEl       = document.getElementById('loading');
const loadingBar      = document.getElementById('loading-bar');
const activeLabelEl   = document.getElementById('active-label');
const introScreen     = document.getElementById('intro-screen');
const coursePanel     = document.getElementById('course-panel');
const courseTitle     = document.getElementById('course-title');
const courseProgressBar = document.getElementById('course-progress-bar');
const nextLessonEl    = document.getElementById('next-lesson');
const progressSphere  = document.getElementById('progress-sphere');
const descriptionEl   = document.getElementById('course-description');
const skillsGrid      = document.getElementById('skills-grid');
const badgeCard       = document.getElementById('badge-card');
const badgeIcon       = document.getElementById('badge-icon');
const badgeName       = document.getElementById('badge-name');
const badgeStatus     = document.getElementById('badge-status');
const thumbIcon       = document.getElementById('thumb-icon');
const thumbGlow       = document.getElementById('thumb-glow');
const addCourseBtn    = document.getElementById('add-course-btn');
const exitCourseBtn   = document.getElementById('exit-course-btn');
const startLessonBtn  = document.getElementById('start-lesson-btn');
const createCourseModal = document.getElementById('create-course-modal');
const newCourseNameInput = document.getElementById('new-course-name');
const confirmNewCourseBtn = document.getElementById('confirm-new-course-btn');
const cancelNewCourseBtn = document.getElementById('cancel-new-course-btn');
const navPrev         = document.getElementById('nav-prev');
const navNext         = document.getElementById('nav-next');
const statTotal       = document.getElementById('stat-total');
const statActive      = document.getElementById('stat-active');

// ── Three.js — ALL PARAMETERS UNCHANGED ─────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(config.backgroundColor);

const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 1.4, 10.2);

scene.environment = null;

const hemi = new THREE.HemisphereLight(0x284260, 0x02040b, 0.32);
scene.add(hemi);

const ptLight = new THREE.PointLight(0x9cc1ff, config.pointLightIntensity, 24, 2.4);
ptLight.position.set(2.8, 2.4, 6.2);
scene.add(ptLight);

const accentLight = new THREE.PointLight(0xffc5ff, config.accentLightIntensity, 10, 2.8);
accentLight.position.set(-1.4, 2.6, 4.4);
scene.add(accentLight);

const ambient = new THREE.AmbientLight(0xffffff, 0.16);
scene.add(ambient);

if (config.enableGrid) {
  const grid = new THREE.GridHelper(18, 28, 0x2f4a7f, 0x090f1b);
  grid.rotation.x = Math.PI / 2;
  grid.position.y = -2.8;
  grid.material.opacity = 0.24;
  grid.material.transparent = true;
  scene.add(grid);
}

function perturbGeometry(geometry, amount = 0.04) {
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
    const displacement = (Math.sin(x * 5.8 + y * 2.9) + Math.cos(z * 6.7 + x * 3.3)) * amount;
    pos.setXYZ(i, x + x * displacement, y + y * displacement, z + z * displacement);
  }
  geometry.computeVertexNormals();
}

function createNoiseTexture(size = 96) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const value = 120 + Math.round((Math.random() - 0.5) * 50);
    data[i * 4] = value; data[i * 4 + 1] = value; data[i * 4 + 2] = value; data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6); texture.needsUpdate = true;
  return texture;
}

function createRockTexture(size = 128) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const x = (i % size) / size; const y = Math.floor(i / size) / size;
    const noise = Math.sin(x * 20) * Math.cos(y * 15) + Math.random() * 0.3;
    const value = Math.max(0, Math.min(255, 110 + noise * 45));
    data[i * 4] = value * 0.86; data[i * 4 + 1] = value * 0.72;
    data[i * 4 + 2] = value * 0.64; data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); texture.encoding = THREE.sRGBEncoding;
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true; return texture;
}

function createDirtTexture(size = 128) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const x = (i % size) / size - 0.5; const y = (Math.floor(i / size) / size) - 0.5;
    const radius = Math.sqrt(x * x + y * y);
    const base = Math.random() * 0.3 + 0.2; const mask = Math.max(0, 1 - radius * 1.5);
    const value = Math.max(0, Math.min(255, (base + mask * 0.45) * 255));
    data[i * 4] = value; data[i * 4 + 1] = value; data[i * 4 + 2] = value; data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3); texture.encoding = THREE.LinearEncoding;
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true; return texture;
}

const noiseTexture = createNoiseTexture();
const rockTexture  = createRockTexture();
const dirtTexture  = createDirtTexture();

function applyVertexGradient(geometry, colorA, colorB) {
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const start = new THREE.Color(colorA); const end = new THREE.Color(colorB);
  const tmp = new THREE.Color();
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const height = Math.max(maxY - minY, 0.0001);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i); const ratio = (y - minY) / height;
    tmp.copy(start).lerp(end, ratio);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

const monolithGroup = new THREE.Group();
const hoverTargets  = [];
const modelCache    = {};

function loadModel(path) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(path, (gltf) => {
      const sceneObj = gltf.scene;
      sceneObj.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
      resolve(sceneObj);
    }, undefined, reject);
  });
}

function crystalMaterial(baseColor, emissiveColor, roughness = config.monolithBaseRoughness) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(baseColor),
    emissive: new THREE.Color(emissiveColor),
    emissiveIntensity: 0.28,
    transmission: config.monolithTransmission,
    thickness: 1.4, roughness,
    roughnessMap: noiseTexture, normalMap: noiseTexture,
    normalScale: new THREE.Vector2(0.10, 0.10),
    map: rockTexture, aoMap: dirtTexture, aoMapIntensity: 0.44,
    metalness: 0.1, ior: 1.65, clearcoat: 0.82, clearcoatRoughness: 0.22,
    reflectivity: 0.35, envMapIntensity: 1.1,
    attenuationColor: new THREE.Color(0x9fc5ff), attenuationDistance: 3.0,
    transparent: true, opacity: 0.88,
    side: THREE.DoubleSide, vertexColors: true,
  });
}

function createCrystal(def) {
  const template = modelCache[def.model];
  if (!template) return;
  const group = template.clone(true);
  group.traverse((child) => {
    if (child.isMesh) {
      const geometry = child.geometry;
      if (geometry.attributes.uv && !geometry.attributes.uv2) {
        geometry.setAttribute('uv2', geometry.attributes.uv.clone());
      }
      if (!geometry.attributes.color) { applyVertexGradient(geometry, def.colorA, def.colorB); }
      child.material = crystalMaterial(def.colorA, def.colorB, config.monolithBaseRoughness);
      hoverTargets.push(child);
    }
  });
  const startPosition = new THREE.Vector3(def.x, def.y, def.z);
  group.position.copy(startPosition);
  const randomScale = def.scale * (0.8 + Math.random() * 0.4);
  group.scale.setScalar(randomScale);
  group.userData = {
    label: def.label,
    id: def.id,
    description: def.description || 'Descubra o conteúdo deste cristal de conhecimento.',
    progress: def.progress || 0,
    nextLesson: def.nextLesson || 'Primeira Aula',
    skills: def.skills || [],
    badge: def.badge || { icon: '◈', name: 'Insígnia', unlocked: false, color: '#d4af37' },
    baseScale: randomScale,
    defaultPosition: startPosition,
    targetPosition: startPosition.clone(),
    targetScale: randomScale * 0.78,
    hiddenOffset: new THREE.Vector3(0, 0, 0),
  };
  monolithGroup.add(group);
}

function initializeCrystals() {
  const modelNames = [...new Set(config.monoliths.map((def) => def.model))];
  Promise.all(modelNames.map((name) => loadModel(`./models/${name}`).then((sceneObj) => { modelCache[name] = sceneObj; })))
    .then(() => {
      config.monoliths.forEach(createCrystal);
      scene.add(monolithGroup);
      updateStats();
      selectIndex(selectedIndex);
    })
    .catch((error) => { console.error('Failed to load crystal models', error); });
}

initializeCrystals();

// ── State ─────────────────────────────────────────────
let introActive = true;
let panelOpen   = false;
let selectedCourse = null;

function updateStats() {
  const total   = config.monoliths.length;
  const badges  = config.monoliths.filter(m => m.badge && m.badge.unlocked).length;
  if (statTotal)  statTotal.textContent  = `${total} curso${total !== 1 ? 's' : ''}`;
  if (statActive) statActive.textContent = `${badges} insígnia${badges !== 1 ? 's' : ''}`;
}

// ── Intro ─────────────────────────────────────────────
function showScene() {
  if (!introActive) return;
  introActive = false;
  introScreen.classList.add('hidden');
}

// ── Skill ring builder ────────────────────────────────
function buildSkillRings(skills) {
  skillsGrid.innerHTML = '';
  const circumference = Math.PI * 2 * 22; // r=22 → 138.23
  skills.forEach((skill, i) => {
    const pct = Math.min(Math.max(skill.pct, 0), 100);
    const offset = circumference * (1 - pct / 100);
    // Derive a colour from the pct (low=muted blue, high=gold)
    const hue = 45 + (pct / 100) * 15;
    const color = `hsl(${hue}, 80%, ${40 + pct * 0.2}%)`;
    const item = document.createElement('div');
    item.className = 'skill-item';
    item.innerHTML = `
      <div class="skill-ring-wrap">
        <svg viewBox="0 0 56 56">
          <circle class="skill-ring-bg" cx="28" cy="28" r="22"/>
          <circle class="skill-ring-fill" cx="28" cy="28" r="22"
            stroke="${color}"
            style="stroke-dashoffset:${circumference}"/>
        </svg>
        <div class="skill-ring-label">${pct}%</div>
      </div>
      <span class="skill-name">${skill.name}</span>
    `;
    skillsGrid.appendChild(item);
    // Animate after paint
    requestAnimationFrame(() => {
      setTimeout(() => {
        const fill = item.querySelector('.skill-ring-fill');
        if (fill) fill.style.strokeDashoffset = offset;
      }, 80 + i * 120);
    });
  });
}

// ── Typewriter for course title ───────────────────────
function typewrite(el, text, speed = 40) {
  el.textContent = '';
  let i = 0;
  const tick = () => { el.textContent += text[i++]; if (i < text.length) setTimeout(tick, speed); };
  tick();
}

// ── Panel update ──────────────────────────────────────
function updateCoursePanel(group) {
  selectedCourse = group;
  const d = group.userData;

  // Typewriter title
  typewrite(courseTitle, d.label, 38);

  // Description
  descriptionEl.textContent = d.description;

  // Progress
  const pct = Math.min(d.progress || 0, 100);
  progressSphere.textContent = `${pct}%`;
  requestAnimationFrame(() => {
    courseProgressBar.style.width = `${pct}%`;
  });

  // Next lesson
  nextLessonEl.textContent = d.nextLesson || 'Primeira Aula';

  // Thumbnail
  const badgeDef = d.badge || {};
  thumbIcon.textContent = badgeDef.icon || '◈';
  thumbGlow.style.background = badgeDef.color
    ? `radial-gradient(circle, ${badgeDef.color}33 0%, transparent 70%)`
    : '';

  // Skills
  buildSkillRings(d.skills || []);

  // Badge
  badgeIcon.textContent = badgeDef.icon || '◈';
  badgeName.textContent = badgeDef.name || 'Insígnia';
  const unlocked = !!badgeDef.unlocked;
  badgeCard.classList.toggle('unlocked', unlocked);
  badgeStatus.textContent = unlocked ? '✦ Conquistada' : 'Bloqueada';
  if (unlocked) {
    badgeCard.classList.add('badge-unlock-burst');
    setTimeout(() => badgeCard.classList.remove('badge-unlock-burst'), 600);
  }

  // Show panel (slide-in)
  coursePanel.classList.remove('hidden');
  panelOpen = true;

  // Position crystal to left-center
  group.userData.targetScale    = group.userData.baseScale * 1.8;
  group.userData.targetPosition = new THREE.Vector3(-3, 0.5, -1);
}

function closeCoursePanel() {
  panelOpen = false;
  coursePanel.classList.add('hidden');
  if (selectedCourse) {
    selectedCourse.userData.targetPosition.copy(selectedCourse.userData.defaultPosition);
    selectedCourse.userData.targetScale = selectedCourse.userData.baseScale * 0.78;
    selectedCourse = null;
  }
}

// ── Events ────────────────────────────────────────────
exitCourseBtn.addEventListener('click', closeCoursePanel);
startLessonBtn.addEventListener('click', () => {
  // Placeholder: could route to lesson page
  console.log('Continue lesson:', selectedCourse?.userData?.nextLesson);
});

navPrev.addEventListener('click', () => { if (!introActive) selectNeighbor(-1); });
navNext.addEventListener('click', () => { if (!introActive) selectNeighbor(1); });

addCourseBtn.addEventListener('click', () => {
  createCourseModal.classList.remove('hidden');
  newCourseNameInput.value = '';
  newCourseNameInput.focus();
});

confirmNewCourseBtn.addEventListener('click', () => {
  const name = newCourseNameInput.value.trim();
  if (!name) return;
  const newId    = `curso-${config.monoliths.length + 1}`;
  const models   = ['Crystal_01.glb', 'Crystal_02.glb', 'Crystal_03.glb'];
  const randomModel = models[Math.floor(Math.random() * models.length)];
  const newCourse = {
    id: newId, label: name, model: randomModel,
    colorA: Math.floor(0x66 + Math.random() * 0x999999),
    colorB: Math.floor(0x66 + Math.random() * 0x999999),
    description: `Inicie sua jornada em ${name} com este cristal de conhecimento recém-manifestado.`,
    nextLesson: 'Aula Introdutória',
    progress: 0,
    skills: [
      { name: 'Fundamentos', pct: 0 },
      { name: 'Prática', pct: 0 },
      { name: 'Avançado', pct: 0 },
      { name: 'Projetos', pct: 0 },
    ],
    badge: {
      icon: ['⬡','◈','✦','⬟','◉'][Math.floor(Math.random() * 5)],
      name: `Mestre de ${name}`,
      unlocked: false,
      color: `hsl(${Math.random() * 360}, 70%, 65%)`,
    },
    x: (Math.random() - 0.5) * 10,
    y: Math.random() * 1.2 - 0.2,
    z: (Math.random() - 0.5) * 10 - 2,
    scale: 0.9 + Math.random() * 0.4,
  };
  config.monoliths.push(newCourse);
  createCourseModal.classList.add('hidden');
  monolithGroup.clear();
  hoverTargets.length = 0;
  initializeCrystals();
});

cancelNewCourseBtn.addEventListener('click', () => { createCourseModal.classList.add('hidden'); });

// ── Bloom & Post-processing (ALL PARAMS UNCHANGED) ───
let bloom = null;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

if (config.enableBloom) {
  bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), config.bloomStrength, config.bloomRadius, config.bloomThreshold);
  composer.addPass(bloom);
}
composer.addPass(new ShaderPass(GammaCorrectionShader));

const finalPass = new ShaderPass({
  uniforms: {
    tDiffuse:       { value: null },
    aberration:     { value: config.enableChromaticAberration ? config.aberration : 0.0 },
    vignetteAmt:    { value: config.vignetteAmt },
    vignetteSmooth: { value: config.vignetteSmooth },
    grainStrength:  { value: config.grainStrength },
    time:           { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float aberration;
    uniform float vignetteAmt;
    uniform float vignetteSmooth;
    uniform float grainStrength;
    uniform float time;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec2 center = vec2(0.5);
      vec2 dir = vUv - center;
      float dist = length(dir);
      float ab = aberration * (1.0 + dist * dist * 3.2);
      float r = texture2D(tDiffuse, vUv + dir * ab * 1.05).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - dir * ab * 0.85).b;
      vec3 col = vec3(r, g, b);
      float vig = 1.0 - smoothstep(vignetteSmooth, vignetteSmooth + 0.4, dist) * vignetteAmt;
      float grain = (hash(vUv + vec2(time * 0.0061, time * 0.0047)) - 0.5) * grainStrength;
      col = (col + grain) * vig;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
composer.addPass(finalPass);

// ── Input ─────────────────────────────────────────────
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

window.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  if (bloom) bloom.setSize(w, h);
});

// ── Loading ───────────────────────────────────────────
let loadPct = 0;
const loadInterval = setInterval(() => {
  loadPct = Math.min(loadPct + Math.random() * 16, 94);
  loadingBar.style.width = `${loadPct}%`;
}, 130);

requestAnimationFrame(() => {
  clearInterval(loadInterval);
  loadingBar.style.width = '100%';
  setTimeout(() => loadingEl.classList.add('hidden'), 700);
});

// ── Selection ─────────────────────────────────────────
let activeMonolith  = null;
let hoveredMonolith = null;
let selectedIndex   = 0;
const centerPosition = new THREE.Vector3(0, 0.18, -2.3);

function selectMonolith(group) {
  if (!group) return;
  activeMonolith = group;
  selectedIndex  = monolithGroup.children.indexOf(group);
  monolithGroup.children.forEach((other) => {
    const defaultPos = other.userData.defaultPosition.clone();
    if (other === activeMonolith) {
      other.userData.targetPosition.copy(centerPosition);
      other.userData.targetScale = other.userData.baseScale * 1.20;
    } else {
      const sideOffset = other.userData.defaultPosition.x < 0 ? -0.72 : 0.72;
      other.userData.targetPosition.copy(defaultPos).add(new THREE.Vector3(sideOffset, -0.08, -0.92));
      other.userData.targetScale = other.userData.baseScale * 0.78;
    }
  });
  if (activeLabelEl) activeLabelEl.textContent = activeMonolith.userData.label;
}

function selectIndex(index) {
  const count = monolithGroup.children.length;
  if (count === 0) return;
  selectedIndex = ((index % count) + count) % count;
  selectMonolith(monolithGroup.children[selectedIndex]);
}

function selectNeighbor(delta) { selectIndex(selectedIndex + delta); }

// ── Pointer events ────────────────────────────────────
window.addEventListener('pointerdown', (event) => {
  if (introActive) return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(hoverTargets, true);
  if (intersects.length) {
    let root = intersects[0].object;
    while (root && !root.userData.label) root = root.parent;
    if (root) { selectMonolith(root); updateCoursePanel(root); }
  }
});

window.addEventListener('wheel', (event) => {
  if (introActive && event.deltaY > 0) { showScene(); return; }
  if (!introActive) { event.preventDefault(); selectNeighbor(Math.sign(event.deltaY)); }
}, { passive: false });

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft'  || event.key === 'ArrowUp')   { event.preventDefault(); selectNeighbor(-1); }
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); selectNeighbor(1); }
  if (event.key === 'Escape') { closeCoursePanel(); }
});

// ── Starfield (UNCHANGED) ─────────────────────────────
function makeStars(count, radius, size) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors    = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = radius + Math.random() * 8;
    positions[i * 3]     = Math.sin(phi) * Math.cos(theta) * r;
    positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
    positions[i * 3 + 2] = Math.cos(phi) * r;
    const t = 0.9 + Math.random() * 0.1;
    colors[i * 3] = t; colors[i * 3 + 1] = t; colors[i * 3 + 2] = t;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity: 0.72, sizeAttenuation: true }));
}

if (config.enableStars) {
  const starfield     = makeStars(2600, 22, 0.032);
  const starfieldNear = makeStars(700,  10, 0.018);
  starfieldNear.position.y = 2.6;
  scene.add(starfield, starfieldNear);
}

// ── Dust particles (UNCHANGED) ────────────────────────
const dustPoints = (() => {
  if (!config.enableDust) return null;
  const dustGeo = new THREE.BufferGeometry();
  const count = 420;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const baseY  = new Float32Array(count);
  const baseX  = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = (Math.random() - 0.15) * 9;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    phases[i] = Math.random() * Math.PI * 2;
    baseY[i]  = positions[i * 3 + 1];
    baseX[i]  = positions[i * 3];
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  dustGeo.setAttribute('phase',    new THREE.BufferAttribute(phases, 1));
  dustGeo.setAttribute('baseY',    new THREE.BufferAttribute(baseY, 1));
  dustGeo.setAttribute('baseX',    new THREE.BufferAttribute(baseX, 1));
  const points = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.02, color: 0x5b8bcc, transparent: true, opacity: 0.36, sizeAttenuation: true }));
  points.position.y = 0.8;
  scene.add(points);
  return points;
})();

// ── Hover (UNCHANGED) ─────────────────────────────────
function updateHover() {
  if (!config.enableHoverEffect) return;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(hoverTargets, true);
  if (intersects.length) {
    let root = intersects[0].object;
    while (root && !root.userData.label) root = root.parent;
    if (root && root.userData.label && root !== activeMonolith) {
      if (hoveredMonolith && hoveredMonolith !== activeMonolith) hoveredMonolith.userData.targetScale = hoveredMonolith.userData.baseScale * 0.78;
      hoveredMonolith = root;
      if (hoveredMonolith !== activeMonolith) hoveredMonolith.userData.targetScale = hoveredMonolith.userData.baseScale * 1.18;
      if (activeLabelEl) activeLabelEl.textContent = hoveredMonolith.userData.label;
    }
  } else if (hoveredMonolith && hoveredMonolith !== activeMonolith) {
    hoveredMonolith.userData.targetScale = hoveredMonolith.userData.baseScale * 0.78;
    hoveredMonolith = null;
    if (activeLabelEl) activeLabelEl.textContent = activeMonolith ? activeMonolith.userData.label : 'Crystallum Primum';
  }
}

// ── Animation loop (UNCHANGED) ────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  updateHover();

  const desiredPositions = monolithGroup.children.map((group, index) => {
    const drift = new THREE.Vector3(
      Math.sin(t * 0.5 + index * 1.5) * 0.12,
      Math.cos(t * 0.4 + index * 1.3) * 0.08,
      Math.sin(t * 0.45 + index * 0.9) * 0.1
    );
    const targetPos  = group.userData.targetPosition || group.userData.defaultPosition;
    const spreadOffset = panelOpen && group === selectedCourse ? new THREE.Vector3(1.8, 0.1, 0) : new THREE.Vector3(0, 0, 0);
    const desired    = targetPos.clone().add(group === activeMonolith ? spreadOffset : drift);
    const bob        = Math.sin(t * 0.45 + index * 0.9) * 0.06 - 0.02;
    desired.y += bob;
    if (panelOpen && group === selectedCourse) desired.add(spreadOffset);
    return desired;
  });

  const minDistance = 1.05;
  for (let i = 0; i < monolithGroup.children.length; i++) {
    for (let j = i + 1; j < monolithGroup.children.length; j++) {
      const a = monolithGroup.children[i], b = monolithGroup.children[j];
      const pa = desiredPositions[i],      pb = desiredPositions[j];
      const diff = pa.clone().sub(pb); const dist = Math.max(diff.length(), 0.0001);
      if (dist < minDistance) {
        const pushAmount = (minDistance - dist) * 0.5;
        const dir = diff.normalize();
        const weightA = a === activeMonolith ? 0.3 : 1.0;
        const weightB = b === activeMonolith ? 0.3 : 1.0;
        const total = weightA + weightB;
        pa.addScaledVector(dir,  pushAmount * (weightB / total));
        pb.addScaledVector(dir, -pushAmount * (weightA / total));
      }
    }
  }

  monolithGroup.children.forEach((group, index) => {
    const desired = desiredPositions[index];
    group.position.lerp(desired, 0.08);
    const targetScale = group.userData.targetScale || group.userData.baseScale;
    group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
    const extraSpin = group === activeMonolith ? t * 0.032 : 0;
    group.rotation.y = Math.sin(t * 0.18 + index * 0.7) * 0.06 + extraSpin;
    group.rotation.x = Math.sin(t * 0.09 + index * 0.9) * 0.04;
    const emissiveTarget = group === activeMonolith ? 0.9 : 0.28;
    group.traverse((child) => {
      if (child.isMesh && child.material && 'emissiveIntensity' in child.material) {
        child.material.emissiveIntensity += (emissiveTarget - child.material.emissiveIntensity) * 0.08;
      }
    });
  });

  ptLight.position.x += ((pointer.x * 5) - ptLight.position.x) * 0.06;
  ptLight.position.y += ((pointer.y * 4 + 2.2) - ptLight.position.y) * 0.06;
  ptLight.intensity    = config.pointLightIntensity + Math.sin(t * 1.9) * 0.32;
  accentLight.position.x = Math.cos(t * 0.35) * 3.8;
  accentLight.position.z = Math.sin(t * 0.35) * 3.8;
  accentLight.intensity   = config.accentLightIntensity + Math.sin(t * 1.1) * 0.22;

  if (dustPoints) {
    const pos   = dustPoints.geometry.attributes.position;
    const bY    = dustPoints.geometry.attributes.baseY.array;
    const bX    = dustPoints.geometry.attributes.baseX.array;
    const phase = dustPoints.geometry.attributes.phase.array;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, bY[i] + Math.sin(t * 0.28 + phase[i]) * 0.18);
      pos.setX(i, bX[i] + Math.sin(t * 0.19 + phase[i] * 1.2) * 0.06);
    }
    pos.needsUpdate = true;
  }
  finalPass.uniforms.time.value = t;
  composer.render();
}

animate();
