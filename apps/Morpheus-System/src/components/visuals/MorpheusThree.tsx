"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type SceneShellProps = {
  className?: string;
};

type SceneController = {
  pause: () => void;
  resume: () => void;
  destroy: () => void;
};

type ClinicHeroRig = {
  root: THREE.Group;
  floor: THREE.Mesh;
  roomBases: THREE.InstancedMesh;
  roomWalls: THREE.InstancedMesh;
  roomDoors: THREE.InstancedMesh;
  slotBlocks: THREE.InstancedMesh;
  doctorBodies: THREE.InstancedMesh;
  doctorHeads: THREE.InstancedMesh;
  signalDots: THREE.InstancedMesh;
  connectors: THREE.LineSegments;
  connectorPositions: Float32Array;
  rooms: Array<{ x: number; z: number; color: THREE.Color; phase: number }>;
  slots: Array<{ x: number; z: number; color: THREE.Color; phase: number; busy: boolean }>;
  doctors: Array<{ x: number; z: number; color: THREE.Color; roomIndex: number; phase: number }>;
};

type PetalBody = {
  base: THREE.Vector3;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  normalX: number;
  normalY: number;
  scale: number;
  phase: number;
};

type ParticleBody = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
};

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const coarsePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1);

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = clamp01((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
};

function createRenderer(container: HTMLDivElement, maxPixelRatio = 2) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.pointerEvents = "none";
  renderer.domElement.style.width = "100%";
  container.appendChild(renderer.domElement);

  return renderer;
}

function disposeMaterial(material: THREE.Material) {
  Object.values(material as unknown as Record<string, unknown>).forEach((value) => {
    if (value instanceof THREE.Texture) {
      value.dispose();
    }
  });
  material.dispose();
}

function disposeScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(disposeMaterial);
    }
  });

  renderer.dispose();
}

function createClinicHeroRig(): ClinicHeroRig {
  const root = new THREE.Group();
  root.rotation.set(-0.58, -0.48, 0.04);

  const palette = [
    new THREE.Color("#3f6b5b"),
    new THREE.Color("#8fae9b"),
    new THREE.Color("#4f8fa5"),
    new THREE.Color("#c98268"),
    new THREE.Color("#d8a24a"),
  ];

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 0.08, 2.85),
    new THREE.MeshStandardMaterial({
      color: "#ece8dd",
      roughness: 0.76,
      metalness: 0.02,
      transparent: true,
      opacity: 0.84,
    })
  );
  floor.position.set(0.12, -0.46, 0.04);
  root.add(floor);

  const roomMaterial = new THREE.MeshStandardMaterial({
    color: "#f7f2e8",
    roughness: 0.72,
    metalness: 0.02,
    vertexColors: true,
  });
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: "#f7f7f2",
    roughness: 0.66,
    metalness: 0.04,
    transparent: true,
    opacity: 0.92,
    vertexColors: true,
  });
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: "#3f6b5b",
    roughness: 0.5,
    metalness: 0.1,
    vertexColors: true,
  });
  const slotMaterial = new THREE.MeshStandardMaterial({
    color: "#8fae9b",
    roughness: 0.62,
    metalness: 0.04,
    transparent: true,
    opacity: 0.88,
    vertexColors: true,
  });
  const doctorMaterial = new THREE.MeshStandardMaterial({
    color: "#3f6b5b",
    roughness: 0.54,
    metalness: 0.08,
    vertexColors: true,
  });
  const headMaterial = new THREE.MeshStandardMaterial({
    color: "#f7f2e8",
    roughness: 0.7,
    metalness: 0.02,
  });
  const signalMaterial = new THREE.MeshStandardMaterial({
    color: "#d8a24a",
    emissive: "#d8a24a",
    emissiveIntensity: 0.18,
    roughness: 0.38,
    metalness: 0.18,
  });

  const rooms = Array.from({ length: 8 }, (_, index) => ({
    x: -1.42 + (index % 4) * 0.82,
    z: -0.56 + Math.floor(index / 4) * 0.72,
    color: palette[index % palette.length],
    phase: index * 0.72,
  }));
  const roomBases = new THREE.InstancedMesh(new THREE.BoxGeometry(0.66, 0.1, 0.5), roomMaterial, rooms.length);
  const roomWalls = new THREE.InstancedMesh(new THREE.BoxGeometry(0.64, 0.34, 0.055), wallMaterial, rooms.length);
  const roomDoors = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.22, 0.055), doorMaterial, rooms.length);
  roomBases.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  roomWalls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  roomDoors.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(roomBases, roomWalls, roomDoors);

  const slots = Array.from({ length: 24 }, (_, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    const busy = [1, 4, 8, 13, 18, 22].includes(index);
    return {
      x: 1.18 + col * 0.36,
      z: -0.96 + row * 0.28,
      color: busy ? palette[(index + 2) % palette.length] : new THREE.Color("#8fae9b").lerp(new THREE.Color("#f7f2e8"), 0.42),
      phase: index * 0.4,
      busy,
    };
  });
  const slotBlocks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.08, 0.16), slotMaterial, slots.length);
  slotBlocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(slotBlocks);

  const doctors = [
    { x: -1.52, z: -0.9, color: palette[0], roomIndex: 0, phase: 0.1 },
    { x: -0.72, z: -0.9, color: palette[2], roomIndex: 1, phase: 1.2 },
    { x: 0.14, z: -0.9, color: palette[3], roomIndex: 2, phase: 2.1 },
    { x: -1.08, z: 0.48, color: palette[1], roomIndex: 4, phase: 3.2 },
    { x: -0.18, z: 0.52, color: palette[4], roomIndex: 5, phase: 4.1 },
    { x: 0.62, z: 0.48, color: palette[0].clone().lerp(palette[2], 0.42), roomIndex: 6, phase: 5.4 },
  ];
  const doctorBodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.105, 0.13, 0.24, 20), doctorMaterial, doctors.length);
  const doctorHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.095, 20, 14), headMaterial, doctors.length);
  const signalDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 14, 10), signalMaterial, doctors.length);
  doctorBodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  doctorHeads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  signalDots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(doctorBodies, doctorHeads, signalDots);

  const connectorPositions = new Float32Array((doctors.length + 4) * 6);
  const connectorGeometry = new THREE.BufferGeometry();
  connectorGeometry.setAttribute("position", new THREE.BufferAttribute(connectorPositions, 3));
  const connectors = new THREE.LineSegments(
    connectorGeometry,
    new THREE.LineBasicMaterial({
      color: "#3f6b5b",
      transparent: true,
      opacity: 0.28,
    })
  );
  root.add(connectors);

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  rooms.forEach((room, index) => {
    roomBases.setColorAt(index, room.color.clone().lerp(new THREE.Color("#f7f7f2"), 0.5));
    roomWalls.setColorAt(index, room.color.clone().lerp(new THREE.Color("#f7f7f2"), 0.68));
    roomDoors.setColorAt(index, room.color);
  });
  slots.forEach((slot, index) => {
    slotBlocks.setColorAt(index, slot.color);
  });
  doctors.forEach((doctor, index) => {
    doctorBodies.setColorAt(index, doctor.color);
  });
  roomBases.instanceColor!.needsUpdate = true;
  roomWalls.instanceColor!.needsUpdate = true;
  roomDoors.instanceColor!.needsUpdate = true;
  slotBlocks.instanceColor!.needsUpdate = true;
  doctorBodies.instanceColor!.needsUpdate = true;

  rooms.forEach((room, index) => {
    matrix.compose(new THREE.Vector3(room.x, -0.35, room.z), quaternion, scale.set(1, 1, 1));
    roomBases.setMatrixAt(index, matrix);
    matrix.compose(new THREE.Vector3(room.x, -0.18, room.z - 0.24), quaternion, scale.set(1, 1, 1));
    roomWalls.setMatrixAt(index, matrix);
    matrix.compose(new THREE.Vector3(room.x + (index % 2 === 0 ? -0.2 : 0.2), -0.24, room.z + 0.23), quaternion, scale.set(1, 1, 1));
    roomDoors.setMatrixAt(index, matrix);
  });

  slots.forEach((slot, index) => {
    matrix.compose(new THREE.Vector3(slot.x, -0.27, slot.z), quaternion, scale.set(1, 1, 1));
    slotBlocks.setMatrixAt(index, matrix);
  });

  doctors.forEach((doctor, index) => {
    matrix.compose(new THREE.Vector3(doctor.x, -0.19, doctor.z), quaternion, scale.set(1, 1, 1));
    doctorBodies.setMatrixAt(index, matrix);
    matrix.compose(new THREE.Vector3(doctor.x, 0, doctor.z), quaternion, scale.set(1, 1, 1));
    doctorHeads.setMatrixAt(index, matrix);
    matrix.compose(new THREE.Vector3(doctor.x, 0.18, doctor.z), quaternion, scale.set(1, 1, 1));
    signalDots.setMatrixAt(index, matrix);
  });

  return {
    root,
    floor,
    roomBases,
    roomWalls,
    roomDoors,
    slotBlocks,
    doctorBodies,
    doctorHeads,
    signalDots,
    connectors,
    connectorPositions,
    rooms,
    slots,
    doctors,
  };
}

function updateClinicHeroRig(rig: ClinicHeroRig, progress: number, time: number) {
  const intro = smoothstep(0.08, 1.2, time);
  const focus = smoothstep(0.08, 0.88, progress);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  rig.root.rotation.x = -0.58 + focus * 0.08 + Math.sin(time * 0.18) * 0.012;
  rig.root.rotation.y = -0.5 + focus * 0.23 + Math.sin(time * 0.16) * 0.016;
  rig.root.rotation.z = 0.04 - focus * 0.035;

  rig.rooms.forEach((room, index) => {
    const bob = Math.sin(time * 0.72 + room.phase) * 0.012;
    const roomIntro = smoothstep(0.02 + index * 0.035, 0.62 + index * 0.035, intro);
    const roomScaleY = THREE.MathUtils.lerp(0.18, 1, roomIntro);
    const yOffset = THREE.MathUtils.lerp(-0.32, 0, roomIntro);

    matrix.compose(new THREE.Vector3(room.x, -0.35 + yOffset + bob, room.z), quaternion, scale.set(1, roomScaleY, 1));
    rig.roomBases.setMatrixAt(index, matrix);
    matrix.compose(new THREE.Vector3(room.x, -0.18 + yOffset + bob, room.z - 0.24), quaternion, scale.set(1, roomScaleY, 1));
    rig.roomWalls.setMatrixAt(index, matrix);
    matrix.compose(
      new THREE.Vector3(room.x + (index % 2 === 0 ? -0.2 : 0.2), -0.24 + yOffset + bob, room.z + 0.23),
      quaternion,
      scale.set(1, roomScaleY, 1)
    );
    rig.roomDoors.setMatrixAt(index, matrix);
  });

  rig.slots.forEach((slot, index) => {
    const slotIntro = smoothstep(0.24 + index * 0.012, 0.86 + index * 0.012, intro);
    const pulse = slot.busy ? (Math.sin(time * 2.1 + slot.phase) + 1) * 0.5 : 0;
    const y = -0.27 + THREE.MathUtils.lerp(-0.22, 0, slotIntro) + pulse * 0.028;
    matrix.compose(
      new THREE.Vector3(slot.x, y, slot.z),
      quaternion,
      scale.set(THREE.MathUtils.lerp(0.35, 1, slotIntro), slot.busy ? 1 + pulse * 0.28 : 0.72, 1)
    );
    rig.slotBlocks.setMatrixAt(index, matrix);
  });

  rig.doctors.forEach((doctor, index) => {
    const doctorIntro = smoothstep(0.34 + index * 0.06, 0.96 + index * 0.06, intro);
    const bob = Math.sin(time * 1.15 + doctor.phase) * 0.018 * doctorIntro;
    const sway = Math.cos(time * 0.7 + doctor.phase) * 0.012 * doctorIntro;
    const x = doctor.x + sway;
    const yOffset = THREE.MathUtils.lerp(-0.34, 0, doctorIntro);

    matrix.compose(new THREE.Vector3(x, -0.19 + yOffset + bob, doctor.z), quaternion, scale.set(1, doctorIntro, 1));
    rig.doctorBodies.setMatrixAt(index, matrix);
    matrix.compose(new THREE.Vector3(x, 0 + yOffset + bob, doctor.z), quaternion, scale.set(doctorIntro, doctorIntro, doctorIntro));
    rig.doctorHeads.setMatrixAt(index, matrix);
    matrix.compose(
      new THREE.Vector3(x + Math.sin(time * 1.4 + doctor.phase) * 0.045, 0.18 + yOffset + bob + Math.cos(time * 1.3 + doctor.phase) * 0.018, doctor.z),
      quaternion,
      scale.set(doctorIntro, doctorIntro, doctorIntro)
    );
    rig.signalDots.setMatrixAt(index, matrix);

    const room = rig.rooms[doctor.roomIndex];
    const connectorIndex = index * 6;
    rig.connectorPositions[connectorIndex] = x;
    rig.connectorPositions[connectorIndex + 1] = -0.02 + bob;
    rig.connectorPositions[connectorIndex + 2] = doctor.z;
    rig.connectorPositions[connectorIndex + 3] = room.x;
    rig.connectorPositions[connectorIndex + 4] = -0.24;
    rig.connectorPositions[connectorIndex + 5] = room.z;
  });

  for (let index = 0; index < 4; index += 1) {
    const room = rig.rooms[index + 2];
    const slot = rig.slots[index * 5 + 2];
    const connectorIndex = (rig.doctors.length + index) * 6;
    rig.connectorPositions[connectorIndex] = room.x;
    rig.connectorPositions[connectorIndex + 1] = -0.25;
    rig.connectorPositions[connectorIndex + 2] = room.z + 0.14;
    rig.connectorPositions[connectorIndex + 3] = slot.x;
    rig.connectorPositions[connectorIndex + 4] = -0.25 + Math.sin(time * 1.1 + index) * 0.014;
    rig.connectorPositions[connectorIndex + 5] = slot.z;
  }

  rig.roomBases.instanceMatrix.needsUpdate = true;
  rig.roomWalls.instanceMatrix.needsUpdate = true;
  rig.roomDoors.instanceMatrix.needsUpdate = true;
  rig.slotBlocks.instanceMatrix.needsUpdate = true;
  rig.doctorBodies.instanceMatrix.needsUpdate = true;
  rig.doctorHeads.instanceMatrix.needsUpdate = true;
  rig.signalDots.instanceMatrix.needsUpdate = true;
  (rig.connectors.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
}

function createLandingScene(container: HTMLDivElement): SceneController {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0.22, 0.42, 5.35);

  const renderer = createRenderer(container);
  const clock = new THREE.Clock();
  const clinic = createClinicHeroRig();
  const reduced = reduceMotion();
  const layout = {
    rootX: 1.22,
    rootY: -0.02,
    rootScale: 1,
    cameraX: 0.22,
    cameraY: 0.42,
    cameraZ: 5.35,
    lookX: 0.34,
    lookY: -0.08,
  };

  let rafId = 0;
  let resizeTimer = 0;
  let destroyed = false;
  let paused = false;
  let framePending = false;
  let targetProgress = getLandingProgress();
  let currentProgress = targetProgress;

  scene.add(clinic.root);

  const ambient = new THREE.HemisphereLight("#f7f7f2", "#3f6b5b", 1.2);
  const key = new THREE.DirectionalLight("#fff9ef", 3.4);
  key.position.set(2.8, 3.4, 4);
  const fill = new THREE.PointLight("#a9d6e5", 3.8, 8);
  fill.position.set(-2.4, 0.7, 2.6);
  const warm = new THREE.PointLight("#c98268", 2.2, 6);
  warm.position.set(2.4, -0.1, 1.5);
  scene.add(ambient, key, fill, warm);

  function getNarrativeDistance() {
    const doc = document.documentElement;
    const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
    return Math.max(Math.min(maxScroll, window.innerHeight * 1.75), 1);
  }

  function getLandingProgress(scroll = window.scrollY) {
    return clamp01(scroll / getNarrativeDistance());
  }

  function syncProgress(event?: Event) {
    const detail =
      event instanceof CustomEvent
        ? (event.detail as { scroll?: number } | undefined)
        : undefined;

    targetProgress =
      typeof detail?.scroll === "number"
        ? getLandingProgress(detail.scroll)
        : getLandingProgress();
  }

  function resize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      const narrow = width < 760;
      layout.rootX = narrow ? 0.52 : 1.22;
      layout.rootY = narrow ? -0.5 : -0.02;
      layout.rootScale = narrow ? 0.72 : 1;
      layout.cameraX = narrow ? 0.08 : 0.22;
      layout.cameraY = narrow ? 0.66 : 0.42;
      layout.cameraZ = narrow ? 5.75 : 5.35;
      layout.lookX = narrow ? 0.08 : 0.34;
      layout.lookY = narrow ? -0.18 : -0.08;
      camera.fov = narrow ? 45 : 40;
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
    }, 120);
  }

  function requestFrame() {
    if (destroyed || paused || framePending) return;
    framePending = true;
    rafId = window.requestAnimationFrame(render);
  }

  function render() {
    framePending = false;
    if (destroyed || paused) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    currentProgress = reduced
      ? targetProgress
      : THREE.MathUtils.damp(currentProgress, targetProgress, 5.8, dt);
    const value = currentProgress;

    updateClinicHeroRig(clinic, value, reduced ? 1.4 : time);

    const focus = smoothstep(0.12, 0.92, value);
    clinic.root.position.set(
      THREE.MathUtils.lerp(layout.rootX, layout.rootX - 0.26, focus),
      layout.rootY + Math.sin(time * 0.24) * 0.018,
      0
    );
    clinic.root.scale.setScalar(layout.rootScale * THREE.MathUtils.lerp(1, 0.94, focus));

    camera.position.x = THREE.MathUtils.lerp(layout.cameraX, layout.cameraX - 0.3, value);
    camera.position.y = THREE.MathUtils.lerp(layout.cameraY, layout.cameraY + 0.1, value);
    camera.position.z = layout.cameraZ;
    camera.lookAt(layout.lookX, layout.lookY, 0);

    renderer.render(scene, camera);
    requestFrame();
  }

  resize();
  syncProgress();
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", syncProgress, { passive: true });
  window.addEventListener("morpheus:lenis-scroll", syncProgress as EventListener);
  requestFrame();

  return {
    pause: () => {
      paused = true;
      if (framePending) {
        window.cancelAnimationFrame(rafId);
        framePending = false;
      }
    },
    resume: () => {
      if (destroyed) return;
      paused = false;
      clock.getDelta();
      requestFrame();
    },
    destroy: () => {
      destroyed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", syncProgress);
      window.removeEventListener("morpheus:lenis-scroll", syncProgress as EventListener);
      disposeScene(scene, renderer);
      renderer.domElement.remove();
    },
  };
}

function viewportAtZ(camera: THREE.PerspectiveCamera, z = 0) {
  const distance = Math.abs(camera.position.z - z);
  const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance;
  return {
    height,
    width: height * camera.aspect,
  };
}

function createParticlePool(count: number) {
  const particles: ParticleBody[] = Array.from({ length: count }, () => ({
    position: new THREE.Vector3(0, -100, 0),
    velocity: new THREE.Vector3(),
    life: 0,
  }));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const baseColor = new THREE.Color("#c98268");

  for (let index = 0; index < count; index += 1) {
    positions[index * 3 + 1] = -100;
    colors[index * 3] = baseColor.r;
    colors[index * 3 + 1] = baseColor.g;
    colors[index * 3 + 2] = baseColor.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.026,
    transparent: true,
    opacity: 0.86,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);

  return { particles, points, positions, colors };
}

function createDashboardVinesScene(container: HTMLDivElement): SceneController {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0, 0, 7);

  const renderer = createRenderer(container, 1.5);
  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const pointerNdc = new THREE.Vector2(4, 4);
  const pointerWorld = new THREE.Vector3(99, 99, 0);
  const clock = new THREE.Clock();
  const reduced = reduceMotion();
  const passiveDashboard = reduced || coarsePointer();
  const vineGroup = new THREE.Group();
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const vineLines: Array<{
    geometry: THREE.BufferGeometry;
    positions: Float32Array;
    normalX: number;
    phase: number;
  }> = [];

  let rafId = 0;
  let resizeTimer = 0;
  let destroyed = false;
  let paused = false;
  let framePending = false;
  let activeParticle = 0;
  let lastParticleAt = 0;

  const petals: PetalBody[] = Array.from({ length: 24 }, (_, index) => ({
    base: new THREE.Vector3(),
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    normalX: -0.9 + (index / 23) * 1.8 + THREE.MathUtils.randFloatSpread(0.04),
    normalY: 0.74 - Math.random() * 0.36,
    scale: 0.055 + Math.random() * 0.055,
    phase: Math.random() * Math.PI * 2,
  }));

  scene.add(vineGroup);
  scene.add(new THREE.AmbientLight("#f7f2e8", 1.4));

  const petalGeometry = new THREE.CircleGeometry(1, 5);
  const petalMaterial = new THREE.MeshBasicMaterial({
    color: "#8fae9b",
    transparent: true,
    opacity: 0.66,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const petalMesh = new THREE.InstancedMesh(petalGeometry, petalMaterial, petals.length);
  petalMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  vineGroup.add(petalMesh);

  const { particles, points, positions: particlePositions, colors: particleColors } = createParticlePool(96);
  vineGroup.add(points);

  const vineMaterial = new THREE.LineBasicMaterial({
    color: "#8fae9b",
    transparent: true,
    opacity: 0.4,
  });

  for (let index = 0; index < 5; index += 1) {
    const positions = new Float32Array(72 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const line = new THREE.Line(geometry, vineMaterial.clone());
    vineGroup.add(line);
    vineLines.push({
      geometry,
      positions,
      normalX: -0.92 + index * 0.46,
      phase: index * 1.4,
    });
  }

  function layoutVines() {
    const viewport = viewportAtZ(camera);
    petals.forEach((petal) => {
      petal.base.set(
        petal.normalX * viewport.width * 0.5,
        petal.normalY * viewport.height * 0.5,
        0
      );
      petal.position.copy(petal.base);
      petal.velocity.set(0, 0, 0);
    });
  }

  function emitParticle(origin: THREE.Vector3) {
    const particle = particles[activeParticle];
    activeParticle = (activeParticle + 1) % particles.length;
    particle.position.copy(origin);
    particle.velocity.set(
      THREE.MathUtils.randFloatSpread(0.26),
      -0.16 - Math.random() * 0.16,
      THREE.MathUtils.randFloatSpread(0.05)
    );
    particle.life = 1;
  }

  function updatePointer(event: PointerEvent) {
    if (passiveDashboard) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const padding = 28;
    if (
      event.clientX < rect.left - padding ||
      event.clientX > rect.right + padding ||
      event.clientY < rect.top - padding ||
      event.clientY > rect.bottom + padding
    ) {
      clearPointer();
      return;
    }

    pointerNdc.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    pointerNdc.y = -(((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
    raycaster.setFromCamera(pointerNdc, camera);
    raycaster.ray.intersectPlane(interactionPlane, pointerWorld);
  }

  function clearPointer() {
    pointerNdc.set(4, 4);
    pointerWorld.set(99, 99, 0);
  }

  function resize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height);
      layoutVines();
    }, 120);
  }

  function requestFrame() {
    if (destroyed || paused || framePending) return;
    framePending = true;
    rafId = window.requestAnimationFrame(render);
  }

  function render() {
    framePending = false;
    if (destroyed || paused) return;

    const dt = Math.min(clock.getDelta(), 0.033);
    const time = clock.elapsedTime;
    const viewport = viewportAtZ(camera);
    const pointerActive = !passiveDashboard && pointerNdc.x < 3;

    vineLines.forEach((vine) => {
      const attr = vine.geometry.getAttribute("position") as THREE.BufferAttribute;
      const startX = vine.normalX * viewport.width * 0.5;
      const topY = viewport.height * 0.48;
      const reach = viewport.height * 0.28;

      for (let index = 0; index < attr.count; index += 1) {
        const t = index / (attr.count - 1);
        const baseX = startX + Math.sin(t * Math.PI * 2.4 + vine.phase) * viewport.width * 0.018;
        const baseY = topY - reach * t;
        const dx = baseX - pointerWorld.x;
        const dy = baseY - pointerWorld.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = pointerActive ? Math.max(0, 1 - dist / 0.92) : 0;

        vine.positions[index * 3] =
          baseX + Math.sin(time * 0.65 + vine.phase + t * 4) * 0.025 + dx * influence * 0.1;
        vine.positions[index * 3 + 1] =
          baseY + Math.cos(time * 0.54 + vine.phase + t * 3) * 0.018 + dy * influence * 0.08;
        vine.positions[index * 3 + 2] = -0.05 - t * 0.04;
      }
      attr.needsUpdate = true;
    });

    petals.forEach((petal, index) => {
      const dx = petal.position.x - pointerWorld.x;
      const dy = petal.position.y - pointerWorld.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const influence = pointerActive ? Math.max(0, 1 - dist / 0.72) : 0;
      const direction = dist > 0.001 ? new THREE.Vector3(dx / dist, dy / dist, 0) : new THREE.Vector3();
      const wind = Math.sin(time * 0.9 + petal.phase) * 0.0014;

      if (!passiveDashboard) {
        petal.velocity.addScaledVector(direction, influence * 0.018);
        petal.velocity.x += wind;
        petal.velocity.addScaledVector(petal.base.clone().sub(petal.position), 0.044);
        petal.velocity.multiplyScalar(0.82);
        petal.position.addScaledVector(petal.velocity, dt * 60);
      } else {
        petal.position.copy(petal.base);
      }

      if (!passiveDashboard && influence > 0.52 && time - lastParticleAt > 0.035) {
        emitParticle(petal.position);
        lastParticleAt = time;
      }

      scale.set(petal.scale * (1 + influence * 0.5), petal.scale * 0.58, petal.scale);
      quaternion.setFromEuler(
        new THREE.Euler(
          0,
          0,
          Math.sin(time + petal.phase) * 0.35 + influence * 0.9
        )
      );
      matrix.compose(petal.position, quaternion, scale);
      petalMesh.setMatrixAt(index, matrix);
    });
    petalMesh.instanceMatrix.needsUpdate = true;

    const color = new THREE.Color();
    particles.forEach((particle, index) => {
      if (particle.life > 0 && !passiveDashboard) {
        particle.life = Math.max(0, particle.life - dt * 0.72);
        particle.position.addScaledVector(particle.velocity, dt);
        particle.velocity.y += dt * 0.035;
      }

      const ix = index * 3;
      particlePositions[ix] = particle.life > 0 ? particle.position.x : 0;
      particlePositions[ix + 1] = particle.life > 0 ? particle.position.y : -100;
      particlePositions[ix + 2] = particle.life > 0 ? particle.position.z : 0;

      color.set("#c98268").multiplyScalar(particle.life);
      particleColors[ix] = color.r;
      particleColors[ix + 1] = color.g;
      particleColors[ix + 2] = color.b;
    });
    (points.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (points.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;

    renderer.render(scene, camera);
    requestFrame();
  }

  resize();
  layoutVines();
  window.addEventListener("resize", resize);
  if (!passiveDashboard) {
    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("pointerleave", clearPointer);
  }
  requestFrame();

  return {
    pause: () => {
      paused = true;
      if (framePending) {
        window.cancelAnimationFrame(rafId);
        framePending = false;
      }
    },
    resume: () => {
      if (destroyed) return;
      paused = false;
      clock.getDelta();
      requestFrame();
    },
    destroy: () => {
      destroyed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", resize);
      if (!passiveDashboard) {
        window.removeEventListener("pointermove", updatePointer);
        window.removeEventListener("pointerleave", clearPointer);
      }
      disposeScene(scene, renderer);
      renderer.domElement.remove();
    },
  };
}

function ThreeScene({
  className,
  factory,
}: SceneShellProps & {
  factory: (container: HTMLDivElement) => SceneController;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const element = containerRef.current;
    const controller = factory(element);
    let inViewport = true;
    let documentVisible = document.visibilityState === "visible";

    const syncLifecycle = () => {
      if (inViewport && documentVisible) {
        controller.resume();
      } else {
        controller.pause();
      }
    };

    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            ([entry]) => {
              inViewport = entry?.isIntersecting ?? true;
              syncLifecycle();
            },
            { rootMargin: "120px", threshold: 0.01 }
          )
        : null;

    const handleVisibility = () => {
      documentVisible = document.visibilityState === "visible";
      syncLifecycle();
    };

    observer?.observe(element);
    document.addEventListener("visibilitychange", handleVisibility);
    syncLifecycle();

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      controller.destroy();
    };
  }, [factory]);

  return <div ref={containerRef} className={className} aria-hidden="true" />;
}

export function LandingShowcase({ className }: SceneShellProps) {
  return <ThreeScene className={className} factory={createLandingScene} />;
}

export function LibraryVinesScene({ className }: SceneShellProps) {
  return <ThreeScene className={className} factory={createDashboardVinesScene} />;
}
