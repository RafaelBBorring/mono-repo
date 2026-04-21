import * as THREE from 'three';
import { createSystemStore } from '../store/systemStore.js';
import { HadesSerializer } from '../core/HadesSerializer.js';
import { cloneData, hexToRgba, rgbaToHex } from '../utils/math.js';

export function createEditor(root, initialData) {
  const store = createSystemStore(initialData);
  root.innerHTML = layout();

  const elements = collectElements(root);
  const sceneContext = createViewport(elements.viewport);
  const stats = { frames: 0, totalTime: 0, fps: 60, lastTime: performance.now() };

  store.getState().system.emitters.forEach((emitter) => {
    sceneContext.scene.add(emitter.points);
  });

  bindToolbar(elements, store);
  bindViewportControls(sceneContext);
  bindStore(elements, store, sceneContext);
  runLoop(store, sceneContext, stats, elements);
}

function layout() {
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">HADES</div>
          <div class="brand-copy">
            <strong>VFX</strong>
            <span>Niagara-inspired browser editor</span>
          </div>
        </div>
        <div class="toolbar">
          <button type="button" id="btn-add-emitter" class="action-btn">+ Emitter</button>
          <button type="button" id="btn-play" class="action-btn is-primary">Play</button>
          <button type="button" id="btn-pause" class="action-btn">Pause</button>
          <button type="button" id="btn-stop" class="action-btn">Stop</button>
          <button type="button" id="btn-reset" class="action-btn">Reset</button>
          <button type="button" id="btn-export" class="action-btn is-secondary">Export JSON</button>
        </div>
      </header>
      <main class="workspace workspace-niagara">
        <aside class="sidebar left-panel">
          <div class="left-panel-scroll">
            <section class="surface">
              <div class="surface-head">
                <span>System Browser</span>
                <span class="status-pill">CPU</span>
              </div>
              <div id="system-tree" class="tree"></div>
            </section>
            <section class="surface">
              <div class="surface-head">
                <span>Playback</span>
                <span id="running-state" class="surface-meta">Running</span>
              </div>
              <div class="playback-panel">
                <label class="field">
                  <span class="field-label">Scrubber</span>
                  <input id="scrubber" type="range" min="0" max="10" step="0.01" value="0" />
                </label>
                <div class="metric-grid">
                  <div class="metric-card"><span>Particles</span><strong id="stat-particles">0</strong></div>
                  <div class="metric-card"><span>FPS</span><strong id="stat-fps">60</strong></div>
                  <div class="metric-card"><span>Time</span><strong id="stat-time">0.0s</strong></div>
                  <div class="metric-card"><span>Emitters</span><strong id="stat-emitters">0</strong></div>
                </div>
              </div>
            </section>
          </div>
        </aside>
        <section class="viewport-panel">
          <div class="viewport-stage">
            <div id="viewport"></div>
            <div class="viewport-badges">
              <span class="surface-meta">Perspective</span>
              <span class="surface-meta">Three.js r128</span>
            </div>
            <div class="hud">
              <div class="hud-card"><span>Active emitter</span><strong id="hud-emitter">Emitter_01</strong></div>
              <div class="hud-card"><span>Simulation target</span><strong id="hud-target">CPU</strong></div>
              <div class="hud-card"><span>Status</span><strong id="hud-status">Simulation Running</strong></div>
            </div>
          </div>
          <div class="viewport-footer">
            <span id="sb-gpu">GPU: WebGL</span>
            <span id="sb-draw">Draw Calls: 2</span>
            <span id="sb-verts">Verts: 0</span>
            <span id="sb-pool">Pool: 0 / 10000</span>
            <span class="footer-spacer"></span>
            <span>HADES VFX SYSTEM v0.1.0-alpha</span>
          </div>
        </section>
        <aside class="sidebar right-panel">
          <div class="right-panel-scroll">
            <section class="surface">
              <div class="surface-head surface-head-strong">
                <div class="surface-head-copy">
                  <span>Selection</span>
                  <span id="selected-emitter-name" class="surface-meta">Emitter_01</span>
                </div>
                <div class="surface-head-actions">
                  <button type="button" id="btn-delete-emitter" class="ghost-btn ghost-btn-danger">Delete</button>
                </div>
              </div>
              <div id="properties-form" class="properties-form"></div>
            </section>
          </div>
        </aside>
      </main>
      <div id="export-modal" class="modal" hidden>
        <div class="modal-card">
          <div class="modal-head">
            <strong>HadesSystem.json</strong>
            <button type="button" id="close-modal" class="ghost-btn">Close</button>
          </div>
          <pre id="json-output" class="json-output"></pre>
          <div class="modal-actions">
            <button type="button" id="download-json" class="action-btn is-primary">Copy JSON</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function collectElements(root) {
  return {
    viewport: root.querySelector('#viewport'),
    tree: root.querySelector('#system-tree'),
    form: root.querySelector('#properties-form'),
    scrubber: root.querySelector('#scrubber'),
    modal: root.querySelector('#export-modal'),
    jsonOutput: root.querySelector('#json-output'),
    runningState: root.querySelector('#running-state'),
    selectedEmitterName: root.querySelector('#selected-emitter-name'),
    hudEmitter: root.querySelector('#hud-emitter'),
    hudTarget: root.querySelector('#hud-target'),
    hudStatus: root.querySelector('#hud-status'),
    statParticles: root.querySelector('#stat-particles'),
    statFps: root.querySelector('#stat-fps'),
    statTime: root.querySelector('#stat-time'),
    statEmitters: root.querySelector('#stat-emitters'),
    sbGpu: root.querySelector('#sb-gpu'),
    sbDraw: root.querySelector('#sb-draw'),
    sbVerts: root.querySelector('#sb-verts'),
    sbPool: root.querySelector('#sb-pool'),
    btnPlay: root.querySelector('#btn-play'),
    btnPause: root.querySelector('#btn-pause'),
    btnStop: root.querySelector('#btn-stop'),
    btnReset: root.querySelector('#btn-reset'),
    btnAddEmitter: root.querySelector('#btn-add-emitter'),
    btnDeleteEmitter: root.querySelector('#btn-delete-emitter'),
    btnExport: root.querySelector('#btn-export'),
    closeModal: root.querySelector('#close-modal'),
    downloadJson: root.querySelector('#download-json')
  };
}

function createViewport(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06030c);
  scene.fog = new THREE.FogExp2(0x06030c, 0.04);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  const directional = new THREE.DirectionalLight(0xffd0a5, 1.2);
  directional.position.set(6, 8, 10);
  scene.add(ambient, directional);

  const grid = new THREE.GridHelper(28, 28, 0x2a1842, 0x140c20);
  grid.material.opacity = 0.45;
  grid.material.transparent = true;
  scene.add(grid);
  const axes = new THREE.AxesHelper(1.2);
  axes.position.y = 0.001;
  scene.add(axes);

  const orbit = {
    down: false,
    mode: 'orbit',
    lastX: 0,
    lastY: 0,
    phi: 0.9,
    theta: 0.6,
    radius: 15,
    target: new THREE.Vector3(0, 2, 0),
    keys: new Set(),
    ctrlActive: false,
    panSpeed: 0.012,
    moveSpeed: 10
  };
  const cameraForward = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const cameraUp = new THREE.Vector3();
  const movement = new THREE.Vector3();

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function updateCamera() {
    camera.position.set(
      orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
      orbit.target.y + orbit.radius * Math.cos(orbit.phi),
      orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta)
    );
    camera.lookAt(orbit.target);
  }

  function updateFreeNavigation(dt) {
    if (!orbit.ctrlActive || !orbit.keys.size) return;

    camera.getWorldDirection(cameraForward);
    cameraForward.normalize();
    cameraRight.crossVectors(cameraForward, camera.up).normalize();
    cameraUp.copy(camera.up).normalize();
    movement.set(0, 0, 0);

    if (orbit.keys.has('KeyW')) movement.add(cameraForward);
    if (orbit.keys.has('KeyS')) movement.sub(cameraForward);
    if (orbit.keys.has('KeyD')) movement.add(cameraRight);
    if (orbit.keys.has('KeyA')) movement.sub(cameraRight);
    if (orbit.keys.has('KeyE')) movement.add(cameraUp);
    if (orbit.keys.has('KeyQ')) movement.sub(cameraUp);

    if (movement.lengthSq() === 0) return;

    movement.normalize();
    const speedBoost = orbit.keys.has('ShiftLeft') || orbit.keys.has('ShiftRight') ? 2.5 : 1;
    const step = orbit.moveSpeed * speedBoost * dt;
    orbit.target.addScaledVector(movement, step);
    updateCamera();
  }

  updateCamera();
  resize();
  window.addEventListener('resize', resize);
  return { scene, camera, renderer, orbit, updateCamera, updateFreeNavigation };
}

function bindViewportControls(context) {
  const { renderer, orbit, updateCamera, camera } = context;
  const panForward = new THREE.Vector3();
  const panRight = new THREE.Vector3();
  const panUp = new THREE.Vector3();
  const panDelta = new THREE.Vector3();

  function isTypingInField() {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable;
  }

  renderer.domElement.addEventListener('pointerdown', (event) => {
    orbit.down = true;
    orbit.mode = event.ctrlKey ? 'pan' : 'orbit';
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
  });
  window.addEventListener('pointerup', () => {
    orbit.down = false;
    orbit.mode = 'orbit';
  });
  window.addEventListener('keydown', (event) => {
    if (isTypingInField()) return;
    if (event.key === 'Control') orbit.ctrlActive = true;
    if (orbit.ctrlActive && /^Key[WSADEQ]$/.test(event.code)) {
      orbit.keys.add(event.code);
      event.preventDefault();
    }
    if (orbit.ctrlActive && /^Shift(Left|Right)$/.test(event.code)) {
      orbit.keys.add(event.code);
    }
  });
  window.addEventListener('keyup', (event) => {
    if (event.key === 'Control') {
      orbit.ctrlActive = false;
      orbit.keys.clear();
    }
    orbit.keys.delete(event.code);
  });
  window.addEventListener('pointermove', (event) => {
    if (!orbit.down) return;
    const dx = event.clientX - orbit.lastX;
    const dy = event.clientY - orbit.lastY;
    if (orbit.mode === 'pan') {
      camera.getWorldDirection(panForward);
      panForward.normalize();
      panRight.crossVectors(panForward, camera.up).normalize();
      panUp.copy(camera.up).normalize();
      const distanceScale = Math.max(orbit.radius * orbit.panSpeed, 0.05);
      panDelta.set(0, 0, 0);
      panDelta.addScaledVector(panRight, -dx * distanceScale);
      panDelta.addScaledVector(panUp, dy * distanceScale);
      orbit.target.add(panDelta);
    } else {
      orbit.theta -= dx * 0.008;
      orbit.phi = Math.max(0.1, Math.min(Math.PI - 0.1, orbit.phi + dy * 0.008));
    }
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
    updateCamera();
  });
  renderer.domElement.addEventListener('wheel', (event) => {
    orbit.radius = Math.max(3, Math.min(40, orbit.radius + event.deltaY * 0.02));
    updateCamera();
    event.preventDefault();
  }, { passive: false });
}

function bindToolbar(elements, store) {
  elements.btnPlay.addEventListener('click', () => store.setRunning(true));
  elements.btnPause.addEventListener('click', () => store.setRunning(false));
  elements.btnStop.addEventListener('click', () => { store.setRunning(false); store.reset(); });
  elements.btnReset.addEventListener('click', () => { store.reset(); store.setRunning(true); });
  elements.btnAddEmitter.addEventListener('click', () => {
    const instance = store.addEmitter(createEmitterPreset(store.getState().emitters.length + 1));
    store.selectEmitter(store.getState().emitters.length - 1);
    rootSceneAdd(store, instance);
  });
  elements.btnDeleteEmitter.addEventListener('click', () => removeEmitterFromUI(store, store.getState().selectedEmitterIndex));
  elements.btnExport.addEventListener('click', () => {
    elements.jsonOutput.textContent = HadesSerializer.export(store.getState().system);
    elements.modal.hidden = false;
  });
  elements.closeModal.addEventListener('click', () => { elements.modal.hidden = true; });
  elements.modal.addEventListener('click', (event) => {
    if (event.target === elements.modal) elements.modal.hidden = true;
  });
  elements.downloadJson.addEventListener('click', () => {
    const payload = HadesSerializer.export(store.getState().system);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(payload).catch(() => { elements.jsonOutput.textContent = payload; });
    else elements.jsonOutput.textContent = payload;
  });
  elements.scrubber.addEventListener('input', (event) => store.setElapsedTime(Number(event.target.value), false));
}

const addedSceneEmitters = new WeakSet();

function rootSceneAdd(store, emitter) {
  const system = store.getState().system;
  if (addedSceneEmitters.has(emitter)) return;
  if (system.__sceneRef) {
    system.__sceneRef.add(emitter.points);
    addedSceneEmitters.add(emitter);
  }
}

function removeEmitterFromUI(store, index) {
  const removed = store.removeEmitter(index);
  if (removed?.removedEmitter && store.getState().system.__sceneRef) {
    store.getState().system.__sceneRef.remove(removed.removedEmitter.points);
  }
}

function bindStore(elements, store, sceneContext) {
  store.getState().system.__sceneRef = sceneContext.scene;
  store.getState().system.emitters.forEach((emitter) => addedSceneEmitters.add(emitter));
  let previousTreeSignature = '';
  let previousSelection = -1;
  let previousCount = store.getState().emitters.length;

  store.subscribe((state) => {
    const treeSignature = `${state.selectedEmitterIndex}:${JSON.stringify(state.emitters.map((emitter) => ({ id: emitter.id, name: emitter.name, enabled: emitter.enabled, spawnRate: emitter.emitterUpdate.spawnRate, renderer: emitter.renderer.type, colorTag: emitter.colorTag })))} `;
    if (treeSignature !== previousTreeSignature) {
      renderTree(elements.tree, state, store);
      previousTreeSignature = treeSignature;
    }
    if (state.selectedEmitterIndex !== previousSelection || state.emitters.length !== previousCount) {
      renderForm(elements.form, state, store);
      previousSelection = state.selectedEmitterIndex;
      previousCount = state.emitters.length;
    }
    const selected = state.selectedEmitterConfig;
    elements.runningState.textContent = state.running ? 'Running' : 'Paused';
    elements.selectedEmitterName.textContent = selected.name;
    elements.hudEmitter.textContent = selected.name;
    elements.hudTarget.textContent = selected.simulationTarget;
    elements.hudStatus.textContent = state.running ? 'Simulation Running' : 'Simulation Paused';
    elements.btnPlay.classList.toggle('is-primary', state.running);
    elements.btnPause.classList.toggle('is-primary', !state.running);
    elements.btnDeleteEmitter.disabled = state.emitters.length <= 1;
  });
}

function runLoop(store, sceneContext, stats, elements) {
  let elapsed = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - stats.lastTime) / 1000, 0.05);
    stats.lastTime = now;
    stats.frames += 1;
    stats.totalTime += dt;
    if (stats.totalTime >= 0.5) {
      stats.fps = Math.round(stats.frames / stats.totalTime);
      stats.frames = 0;
      stats.totalTime = 0;
      store.setFps(stats.fps, false);
    }
    if (store.getState().running) {
      elapsed += dt;
      store.getState().system.update(dt);
      store.setElapsedTime(elapsed, false);
    }
    sceneContext.updateFreeNavigation(dt);
    sceneContext.renderer.render(sceneContext.scene, sceneContext.camera);
    updateViewportStats(store, elements, elapsed, stats.fps);
  }
  requestAnimationFrame(frame);
}

function updateViewportStats(store, elements, elapsedTime, fps) {
  let totalParticles = 0;
  store.getState().system.emitters.forEach((emitter) => { totalParticles += emitter.liveCount; });
  elements.statParticles.textContent = totalParticles.toLocaleString();
  elements.statFps.textContent = String(fps);
  elements.statTime.textContent = `${elapsedTime.toFixed(2)}s`;
  elements.statEmitters.textContent = String(store.getState().system.emitters.length);
  elements.scrubber.value = String(Math.min(Number(elements.scrubber.max), elapsedTime));
  elements.sbGpu.textContent = `GPU: ${store.getState().system.__sceneRef ? 'WebGL' : 'Unknown'}`;
  elements.sbDraw.textContent = `Draw Calls: ${store.getState().system.emitters.length}`;
  elements.sbVerts.textContent = `Verts: ${totalParticles.toLocaleString()}`;
  elements.sbPool.textContent = `Pool: ${totalParticles} / 10000`;
}

function renderTree(container, state, store) {
  container.innerHTML = state.emitters.map((emitter, index) => `
    <div class="tree-row ${index === state.selectedEmitterIndex ? 'is-active' : ''}">
      <button type="button" class="tree-item ${index === state.selectedEmitterIndex ? 'is-active' : ''}" data-emitter-index="${index}">
        <span class="tree-dot" style="background:${emitter.colorTag}"></span>
        <span class="tree-copy">
          <strong>${emitter.name}</strong>
          <small>${emitter.renderer.type} &middot; ${emitter.emitterUpdate.spawnRate}/s</small>
        </span>
        <span class="tree-flag ${emitter.enabled ? 'is-on' : 'is-off'}">${emitter.enabled ? 'ON' : 'OFF'}</span>
      </button>
      <button type="button" class="tree-delete" data-delete-emitter="${index}" ${state.emitters.length <= 1 ? 'disabled' : ''}>×</button>
    </div>
  `).join('');
  container.querySelectorAll('[data-emitter-index]').forEach((button) => button.addEventListener('click', () => store.selectEmitter(Number(button.dataset.emitterIndex))));
  container.querySelectorAll('[data-delete-emitter]').forEach((button) => button.addEventListener('click', () => removeEmitterFromUI(store, Number(button.dataset.deleteEmitter))));
}

function renderForm(container, state, store) {
  const e = state.selectedEmitterConfig;
  const gradient = `linear-gradient(90deg, ${rgbaToHex(e.particleSpawn.initializeParticle.colorStart)} 0%, ${rgbaToHex(e.particleSpawn.initializeParticle.colorEnd)} 100%)`;
  container.innerHTML = `
    <div class="selection-summary"><div class="selection-pill"><span class="tree-dot" style="background:${e.colorTag}"></span><strong>${e.name}</strong></div><span class="surface-meta">${e.simulationTarget} SIM</span></div>
    ${stackSection('Emitter Update', `<div class="field-grid">${selectField('Emitter State', e.emitterUpdate.emitterState, ['Infinite', 'Once', 'Looping', 'Inactive'], ['emitterUpdate', 'emitterState'])}${numberPairField('Spawn Rate', e.emitterUpdate.spawnRate, 1, 500, 1, ['emitterUpdate', 'spawnRate'])}${numberPairField('Spawn Burst Count', e.emitterUpdate.burstSpawn?.[0]?.count ?? 0, 0, 500, 1, ['emitterUpdate', 'burstSpawn', 0, 'count'])}${numberPairField('Spawn Burst Time', e.emitterUpdate.burstSpawn?.[0]?.time ?? 0, 0, 10, 0.05, ['emitterUpdate', 'burstSpawn', 0, 'time'])}</div>`)}
    ${stackSection('Emitter Transform', `<div class="field-grid">${vectorFieldGroup('Position', e.emitterTransform?.position, ['emitterTransform', 'position'])}${vectorFieldGroup('Rotation', e.emitterTransform?.rotation, ['emitterTransform', 'rotation'])}${vectorFieldGroup('Scale', e.emitterTransform?.scale, ['emitterTransform', 'scale'])}</div>`)}
    ${stackSection('Particle Spawn', `${subSection('Initialize Particle', `<div class="field-grid">${numberPairField('Lifetime Min', e.particleSpawn.initializeParticle.lifetimeMin, 0.1, 10, 0.1, ['particleSpawn', 'initializeParticle', 'lifetimeMin'])}${numberPairField('Lifetime Max', e.particleSpawn.initializeParticle.lifetimeMax, 0.1, 10, 0.1, ['particleSpawn', 'initializeParticle', 'lifetimeMax'])}${colorField('Color Start', rgbaToHex(e.particleSpawn.initializeParticle.colorStart), ['particleSpawn', 'initializeParticle', 'colorStart'])}${colorField('Color End', rgbaToHex(e.particleSpawn.initializeParticle.colorEnd), ['particleSpawn', 'initializeParticle', 'colorEnd'])}<div class="field-card field-card-accent"><label class="field-label">Color / Alpha Preview</label><div class="gradient-strip" style="background:${gradient}"></div></div>${numberPairField('Sprite / Mesh Size Min', e.particleSpawn.initializeParticle.sizeMin, 0.01, 1, 0.01, ['particleSpawn', 'initializeParticle', 'sizeMin'])}${numberPairField('Sprite / Mesh Size Max', e.particleSpawn.initializeParticle.sizeMax, 0.01, 1, 0.01, ['particleSpawn', 'initializeParticle', 'sizeMax'])}${numberPairField('Mass', e.particleSpawn.initializeParticle.mass, 0.1, 10, 0.1, ['particleSpawn', 'initializeParticle', 'mass'])}</div>`)}${subSection('Shape Location', `<div class="field-grid">${selectField('Shape', e.particleSpawn.shapeLocation.type, ['sphere', 'box', 'cylinder', 'cone'], ['particleSpawn', 'shapeLocation', 'type'])}${numberPairField('Radius', e.particleSpawn.shapeLocation.radius, 0.1, 5, 0.1, ['particleSpawn', 'shapeLocation', 'radius'])}${vectorFieldGroup('Dimensions', e.particleSpawn.shapeLocation.dimensions, ['particleSpawn', 'shapeLocation', 'dimensions'])}${toggleField('Mesh Sampling Enabled', e.particleSpawn.shapeLocation.meshSampling.enabled, ['particleSpawn', 'shapeLocation', 'meshSampling', 'enabled'])}${textField('Mesh Sampling Ref (.obj/.glb)', e.particleSpawn.shapeLocation.meshSampling.meshRef, ['particleSpawn', 'shapeLocation', 'meshSampling', 'meshRef'])}</div>`)}${subSection('Add Velocity', `<div class="field-grid">${selectField('Velocity Mode', e.particleSpawn.addVelocity.mode, ['linear', 'cone'], ['particleSpawn', 'addVelocity', 'mode'])}${numberPairField('Speed', e.particleSpawn.addVelocity.scale, 0.1, 20, 0.1, ['particleSpawn', 'addVelocity', 'scale'])}${numberPairField('Cone Angle', e.particleSpawn.addVelocity.coneAngle, 1, 180, 1, ['particleSpawn', 'addVelocity', 'coneAngle'])}</div>`)} `)}
    ${stackSection('Particle Update', `${subSection('Particle State', `<div class="field-grid">${toggleField('Kill On Lifetime End', e.particleUpdate.particleState.killOnLifetimeEnd, ['particleUpdate', 'particleState', 'killOnLifetimeEnd'])}</div>`)}${subSection('Gravity Force', `<div class="field-grid">${toggleField('Gravity Enabled', e.particleUpdate.gravityForce.enabled, ['particleUpdate', 'gravityForce', 'enabled'])}${vectorFieldGroup('Gravity Vector', e.particleUpdate.gravityForce, ['particleUpdate', 'gravityForce'])}</div>`)}${subSection('Drag', `<div class="field-grid">${toggleField('Drag Enabled', e.particleUpdate.drag.enabled, ['particleUpdate', 'drag', 'enabled'])}${numberPairField('Drag Coefficient', e.particleUpdate.drag.coefficient, 0, 5, 0.01, ['particleUpdate', 'drag', 'coefficient'])}</div>`)}${subSection('Vortex Force', `<div class="field-grid">${toggleField('Vortex Enabled', e.particleUpdate.vortexForce.enabled, ['particleUpdate', 'vortexForce', 'enabled'])}${numberPairField('Vortex Strength', e.particleUpdate.vortexForce.strength, 0, 10, 0.1, ['particleUpdate', 'vortexForce', 'strength'])}</div>`)}${subSection('Curl Noise', `<div class="field-grid">${toggleField('Curl Noise Enabled', e.particleUpdate.curlNoise.enabled, ['particleUpdate', 'curlNoise', 'enabled'])}${numberPairField('Noise Scale', e.particleUpdate.curlNoise.scale, 0.1, 5, 0.05, ['particleUpdate', 'curlNoise', 'scale'])}${numberPairField('Noise Strength', e.particleUpdate.curlNoise.strength, 0, 10, 0.1, ['particleUpdate', 'curlNoise', 'strength'])}${numberPairField('Noise Frequency', e.particleUpdate.curlNoise.frequency, 0.1, 4, 0.05, ['particleUpdate', 'curlNoise', 'frequency'])}</div>`)}${subSection('Collision', `<div class="field-grid">${toggleField('Collision Enabled', e.particleUpdate.collision.enabled, ['particleUpdate', 'collision', 'enabled'])}${selectField('Collision Mode', e.particleUpdate.collision.mode, ['plane'], ['particleUpdate', 'collision', 'mode'])}${numberPairField('Restitution', e.particleUpdate.collision.restitution, 0, 1, 0.01, ['particleUpdate', 'collision', 'restitution'])}${numberPairField('Friction', e.particleUpdate.collision.friction, 0, 1, 0.01, ['particleUpdate', 'collision', 'friction'])}</div>`)}${subSection('Scale Color / Size', `<div class="field-grid">${toggleField('Scale Color Enabled', e.particleUpdate.scaleColorOverLife.enabled, ['particleUpdate', 'scaleColorOverLife', 'enabled'])}${toggleField('Scale Size Enabled', e.particleUpdate.scaleSizeOverLife.enabled, ['particleUpdate', 'scaleSizeOverLife', 'enabled'])}</div>`)} `)}
    ${stackSection('Render', `${subSection('Renderer Mode', `<div class="field-grid">${selectField('Renderer Type', e.renderer.type, [{ value: 'sprite', label: 'Sprite Renderer' }, { value: 'mesh', label: 'Mesh Renderer' }], ['renderer', 'type'])}${numberPairField('Emissive Intensity', e.renderer.emissiveIntensity ?? 1, 0, 8, 0.1, ['renderer', 'emissiveIntensity'])}</div>`)}${subSection('Sprite Renderer', `<div class="field-grid">${textField('Material / Texture', e.renderer.materialTexture ?? '', ['renderer', 'materialTexture'])}${selectField('Alignment', e.renderer.spriteRenderer.alignment, [{ value: 'camera', label: 'Facing Camera' }, { value: 'velocity', label: 'Velocity Aligned' }], ['renderer', 'spriteRenderer', 'alignment'])}${selectField('Blending Mode', e.renderer.spriteRenderer.blendingMode, ['additive', 'translucent', 'opaque'], ['renderer', 'spriteRenderer', 'blendingMode'])}</div>`)}${subSection('Mesh Renderer', `<div class="field-grid">${selectField('Mesh', e.renderer.meshRenderer.meshRef || 'sphere', [{ value: 'sphere', label: 'Sphere' }, { value: 'cube', label: 'Cube' }, { value: 'cylinder', label: 'Cylinder' }], ['renderer', 'meshRenderer', 'meshRef'])}${toggleField('Use Particle Color', e.renderer.meshRenderer.useParticleColor, ['renderer', 'meshRenderer', 'useParticleColor'])}${colorField('Mesh Base Color', rgbaToHex(e.renderer.meshRenderer.baseColor ?? e.particleSpawn.initializeParticle.colorStart), ['renderer', 'meshRenderer', 'baseColor'])}${colorField('Mesh Emissive Color', rgbaToHex(e.renderer.meshRenderer.emissiveColor ?? e.renderer.meshRenderer.baseColor ?? e.particleSpawn.initializeParticle.colorStart), ['renderer', 'meshRenderer', 'emissiveColor'])}${numberPairField('Mesh Emissive Intensity', e.renderer.meshRenderer.emissiveIntensity ?? e.renderer.emissiveIntensity ?? 1, 0, 8, 0.1, ['renderer', 'meshRenderer', 'emissiveIntensity'])}${toggleField('Override Materials', e.renderer.meshRenderer.overrideMaterial, ['renderer', 'meshRenderer', 'overrideMaterial'])}${textField('Override Material Name', e.renderer.meshRenderer.overrideMaterialName, ['renderer', 'meshRenderer', 'overrideMaterialName'])}</div>`)} `)}
  `;
  bindFormInteractions(container, state, store);
}

function bindFormInteractions(container, state, store) {
  const index = state.selectedEmitterIndex;
  container.querySelectorAll('[data-control-path]').forEach((control) => {
    const path = JSON.parse(control.dataset.controlPath);
    const type = control.dataset.controlType;
    if (type === 'range') control.addEventListener('input', () => { const numberInput = container.querySelector(`[data-paired-input="${control.dataset.pairId}"]`); if (numberInput) numberInput.value = control.value; applyPatchFromControl(store, index, path, Number(control.value)); });
    if (type === 'number') control.addEventListener('input', () => { const numeric = Number(control.value); if (Number.isNaN(numeric)) return; const slider = container.querySelector(`[data-paired-slider="${control.dataset.pairId}"]`); if (slider) slider.value = control.value; applyPatchFromControl(store, index, path, numeric); });
    if (type === 'text') control.addEventListener('input', () => applyPatchFromControl(store, index, path, control.value));
    if (type === 'select') control.addEventListener('change', () => applyPatchFromControl(store, index, path, castSelectValue(control.value, path[path.length - 1])));
    if (type === 'checkbox') control.addEventListener('change', () => applyPatchFromControl(store, index, path, control.checked));
    if (type === 'color') control.addEventListener('input', () => { applyPatchFromControl(store, index, path, hexToRgba(control.value)); const sibling = control.closest('.field-card').querySelector('.color-value'); if (sibling) sibling.textContent = control.value.toUpperCase(); });
  });
}

function applyPatchFromControl(store, index, path, value) {
  store.patchEmitter(index, (draft) => {
    const pathKey = path.join('.');
    setByPath(draft, path, value);
    if (pathKey === 'particleSpawn.initializeParticle.colorStart') draft.particleUpdate.scaleColorOverLife.stops[0].color = cloneData(value);
    if (pathKey === 'particleSpawn.initializeParticle.colorEnd') draft.particleUpdate.scaleColorOverLife.stops[draft.particleUpdate.scaleColorOverLife.stops.length - 1].color = cloneData(value);
    if (pathKey === 'particleSpawn.initializeParticle.colorStart' && draft.renderer.meshRenderer.useParticleColor !== false) {
      draft.renderer.meshRenderer.baseColor = cloneData(value);
      draft.renderer.meshRenderer.emissiveColor = cloneData(value);
    }
    if (pathKey === 'renderer.type') {
      const useMeshRenderer = value === 'mesh';
      draft.renderer.spriteRenderer.enabled = !useMeshRenderer;
      draft.renderer.meshRenderer.enabled = useMeshRenderer;
    }
    if (pathKey === 'renderer.emissiveIntensity') {
      draft.renderer.meshRenderer.emissiveIntensity = value;
    }
    if (pathKey === 'renderer.spriteRenderer.blendingMode') {
      draft.renderer.blendMode = value;
    }
    if (draft.particleSpawn.initializeParticle.lifetimeMax < draft.particleSpawn.initializeParticle.lifetimeMin) draft.particleSpawn.initializeParticle.lifetimeMax = draft.particleSpawn.initializeParticle.lifetimeMin;
    if (draft.particleSpawn.initializeParticle.sizeMax < draft.particleSpawn.initializeParticle.sizeMin) draft.particleSpawn.initializeParticle.sizeMax = draft.particleSpawn.initializeParticle.sizeMin;
    if (draft.emitterTransform) {
      draft.emitterTransform.scale.x = Math.max(draft.emitterTransform.scale.x, 0.001);
      draft.emitterTransform.scale.y = Math.max(draft.emitterTransform.scale.y, 0.001);
      draft.emitterTransform.scale.z = Math.max(draft.emitterTransform.scale.z, 0.001);
    }
    draft.emitterSpawn.loop = draft.emitterUpdate.emitterState !== 'Once';
    draft.renderer.blendMode = draft.renderer.spriteRenderer.blendingMode || draft.renderer.blendMode;
  });
}

function setByPath(target, path, value) {
  let ref = target;
  for (let index = 0; index < path.length - 1; index += 1) ref = ref[path[index]];
  ref[path[path.length - 1]] = value;
}

function castSelectValue(value, key) {
  if (key === 'substeps') return Number(value);
  return value;
}

function numberPairField(label, value, min, max, step, path) {
  const pairId = path.join('-');
  return `<div class="field-card"><label class="field-label">${label}</label><div class="field-inline"><input class="field-range" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-control-type="range" data-control-path='${JSON.stringify(path)}' data-pair-id="${pairId}" data-paired-slider="${pairId}" /><input class="field-number" type="number" min="${min}" max="${max}" step="${step}" value="${value}" data-control-type="number" data-control-path='${JSON.stringify(path)}' data-pair-id="${pairId}" data-paired-input="${pairId}" /></div></div>`;
}

function textField(label, value, path) { return `<div class="field-card"><label class="field-label">${label}</label><input class="field-text" type="text" value="${value}" data-control-type="text" data-control-path='${JSON.stringify(path)}' /></div>`; }
function selectField(label, value, options, path) { const normalized = options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option)); return `<div class="field-card"><label class="field-label">${label}</label><select class="field-select" data-control-type="select" data-control-path='${JSON.stringify(path)}'>${normalized.map((option) => `<option value="${option.value}" ${String(option.value) === String(value) ? 'selected' : ''}>${option.label}</option>`).join('')}</select></div>`; }
function toggleField(label, checked, path) { return `<div class="field-card"><label class="field-toggle"><span class="field-label">${label}</span><input type="checkbox" ${checked ? 'checked' : ''} data-control-type="checkbox" data-control-path='${JSON.stringify(path)}' /></label></div>`; }
function colorField(label, value, path) { return `<div class="field-card"><label class="field-label">${label}</label><div class="color-row"><input class="field-color" type="color" value="${value}" data-control-type="color" data-control-path='${JSON.stringify(path)}' /><span class="color-value">${value.toUpperCase()}</span></div></div>`; }
function vectorFieldGroup(label, vector, path) { return `<div class="field-card"><label class="field-label">${label}</label><div class="vec-grid">${numberCompactField('X', vector?.x ?? 0, -50, 50, 0.1, [...path, 'x'])}${numberCompactField('Y', vector?.y ?? 0, -50, 50, 0.1, [...path, 'y'])}${numberCompactField('Z', vector?.z ?? 0, -50, 50, 0.1, [...path, 'z'])}</div></div>`; }
function numberCompactField(axis, value, min, max, step, path) { return `<label class="vec-field"><span>${axis}</span><input class="field-number" type="number" min="${min}" max="${max}" step="${step}" value="${value}" data-control-type="number" data-control-path='${JSON.stringify(path)}' /></label>`; }
function stackSection(title, content) { return `<details class="stack-section" open><summary class="stack-section-head">${title}</summary><div class="stack-section-body">${content}</div></details>`; }
function subSection(title, content) { return `<details class="stack-subsection" open><summary class="stack-subsection-head">${title}</summary><div class="stack-subsection-body">${content}</div></details>`; }

function createEmitterPreset(index) {
  return {
    id: `emitter-${String(index).padStart(2, '0')}`,
    name: `Emitter_${String(index).padStart(2, '0')}`,
    colorTag: '#7bc4ff',
    enabled: true,
    simulationTarget: 'CPU',
    emitterTransform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    },
    emitterSpawn: { loop: true, duration: 5, delay: 0, loopCount: 0 },
    emitterUpdate: { spawnRate: 35, burstSpawn: [{ count: 15, time: 0.25 }], emitterState: 'Infinite' },
    particleSpawn: {
      initializeParticle: { enabled: true, lifetimeMin: 1.2, lifetimeMax: 2.2, colorStart: { r: 0.48, g: 0.76, b: 1, a: 1 }, colorEnd: { r: 0.1, g: 0.2, b: 1, a: 0 }, mass: 1, sizeMin: 0.05, sizeMax: 0.16, rotationMin: 0, rotationMax: 0 },
      shapeLocation: { enabled: true, type: 'sphere', radius: 0.45, dimensions: { x: 0.9, y: 0.9, z: 0.9 }, surfaceOnly: false, meshSampling: { enabled: false, meshRef: '', mode: 'surface' } },
      addVelocity: { enabled: true, mode: 'linear', scale: 2.6, coneAngle: 20, direction: { x: 0, y: 1, z: 0 }, pointRef: { x: 0, y: 0, z: 0 } },
      spawnAtLocation: { x: 0, y: 0, z: 0 }
    },
    particleUpdate: {
      particleState: { enabled: true, killOnLifetimeEnd: true },
      gravityForce: { enabled: true, x: 0, y: -0.5, z: 0 },
      drag: { enabled: true, coefficient: 0.2 },
      vortexForce: { enabled: false, strength: 1.2, axis: { x: 0, y: 1, z: 0 } },
      curlNoise: { enabled: false, scale: 1, strength: 2, frequency: 0.5 },
      pointAttraction: { enabled: false, position: { x: 0, y: 1.5, z: 0 }, strength: 1.5, falloff: 4 },
      turbulence: { enabled: false, intensity: 1.2, frequency: 0.9 },
      collision: { enabled: false, mode: 'plane', restitution: 0.2, friction: 0.25 },
      scaleColorOverLife: { enabled: true, stops: [{ position: 0, color: { r: 0.48, g: 0.76, b: 1, a: 1 } }, { position: 1, color: { r: 0.1, g: 0.2, b: 1, a: 0 } }] },
      scaleSizeOverLife: { enabled: true, points: [{ time: 0, value: 0.6 }, { time: 0.4, value: 1.1 }, { time: 1, value: 0.2 }] },
      rotationRate: 0,
      solver: 'euler',
      maxVelocity: 28,
      substeps: 1
    },
    renderer: {
      type: 'sprite',
      blendMode: 'translucent',
      sortMode: 'none',
      emissiveIntensity: 1.4,
      materialTexture: '',
      subUV: { rows: 1, cols: 1, frameRate: 0 },
      softParticles: false,
      facingMode: 'camera',
      spriteRenderer: { enabled: true, materialTexture: '', alignment: 'camera', blendingMode: 'translucent' },
      meshRenderer: { enabled: false, meshRef: 'sphere', useParticleColor: true, baseColor: { r: 0.48, g: 0.76, b: 1, a: 1 }, emissiveColor: { r: 0.48, g: 0.76, b: 1, a: 1 }, overrideMaterial: false, overrideMaterialName: '', emissiveIntensity: 1.4 }
    }
  };
}
