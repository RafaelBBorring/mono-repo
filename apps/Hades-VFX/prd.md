# HADES VFX System — Product Requirements Document

> **Version:** 0.1.0-alpha  
> **Status:** In Development  
> **Inspiration:** Unreal Engine 5 Niagara VFX System  
> **Stack:** Three.js · WebGL2 · React (v2) · WASM (v3)

---

## 1. Vision & Mission

HADES (Hyperreal Animation & Dynamic Effects System) é um editor de sistemas de partículas e VFX rodando inteiramente no browser, com paridade funcional ao Niagara System da Unreal Engine 5. O objetivo é democratizar o pipeline de criação de efeitos visuais complexos, eliminando a dependência de engines proprietárias para prototipação e visualização web.

### Princípios Fundamentais

- **Data-Driven First:** Todo efeito é um JSON serializável, portável e versionável
- **Fidelidade ao Niagara:** Nomenclatura, estrutura de módulos e lógica de execução alinhados ao Niagara
- **Performance sem concessões:** 100k+ partículas a 60fps como meta de produção
- **Portabilidade total:** Um arquivo `.json` deve reproduzir o efeito em qualquer cena Three.js via `HadesPlayer`

---

## 2. Paridade com o Niagara System — Checklist Completo

### 2.1 System Level

| Feature | Niagara | HADES v0.1 | HADES v1.0 |
|---|---|---|---|
| Multi-Emitter Stack | ✅ | ✅ | ✅ |
| System State Machine | ✅ | ⚠️ Parcial | ✅ |
| Loop / One-Shot / N-Times | ✅ | ✅ | ✅ |
| Warm-Up simulation | ✅ | ❌ | ✅ |
| Scalability Groups | ✅ | ❌ | ✅ |
| Asset Thumbnail Preview | ✅ | ❌ | ✅ |
| System Templates (Fountain, Smoke, Fire) | ✅ | ❌ | ✅ |
| Inheritance / Parent System | ✅ | ❌ | v2 |

### 2.2 Emitter Level

| Feature | Niagara | HADES v0.1 | HADES v1.0 |
|---|---|---|---|
| CPU Simulation | ✅ | ✅ | ✅ |
| GPU Simulation (Compute Shaders) | ✅ | ❌ | ✅ |
| Emitter Enabled Toggle | ✅ | ✅ | ✅ |
| Emitter Color Tag | ✅ | ✅ | ✅ |
| Spawn Rate | ✅ | ✅ | ✅ |
| Burst Spawn | ✅ | ⚠️ UI only | ✅ |
| Emitter State (Active/Inactive) | ✅ | ⚠️ Parcial | ✅ |
| Fixed Bounds | ✅ | ❌ | ✅ |
| Local/World Space | ✅ | ❌ | ✅ |

### 2.3 Particle Spawn Modules

| Module | Niagara | HADES v0.1 | HADES v1.0 |
|---|---|---|---|
| Initialize Particle | ✅ | ✅ | ✅ |
| Lifetime (min/max) | ✅ | ✅ | ✅ |
| Color (start/end) | ✅ | ✅ | ✅ |
| Mass | ✅ | ✅ UI | ✅ |
| Size (min/max) | ✅ | ✅ | ✅ |
| Shape Location — Sphere | ✅ | ✅ | ✅ |
| Shape Location — Cylinder | ✅ | ✅ | ✅ |
| Shape Location — Box | ✅ | ✅ | ✅ |
| Shape Location — Cone | ✅ | ✅ | ✅ |
| Shape Location — Mesh Surface | ✅ | ❌ | ✅ |
| Shape Location — Skeletal Mesh | ✅ | ❌ | v2 |
| Add Velocity — In Cone | ✅ | ✅ | ✅ |
| Add Velocity — Linear | ✅ | ✅ | ✅ |
| Add Velocity — Random | ✅ | ✅ | ✅ |
| Add Velocity — From Point | ✅ | ❌ | ✅ |
| Spawn at Location | ✅ | ⚠️ | ✅ |
| Sprite Size | ✅ | ✅ | ✅ |
| Mesh Index | ✅ | ❌ | ✅ |

### 2.4 Particle Update Modules

| Module | Niagara | HADES v0.1 | HADES v1.0 |
|---|---|---|---|
| Gravity Force | ✅ | ✅ | ✅ |
| Drag | ✅ | ✅ | ✅ |
| Vortex Force | ✅ | ✅ | ✅ |
| Curl Noise Force | ✅ | ✅ (CPU) | ✅ GPU |
| Collision (Plane) | ✅ | ❌ | ✅ |
| Collision (Depth Buffer) | ✅ | ❌ | v2 |
| Point Attraction Force | ✅ | ❌ | ✅ |
| Turbulence Force | ✅ | ❌ | ✅ |
| Vector Noise Force | ✅ | ❌ | ✅ |
| Scale Color over Life | ✅ | ✅ | ✅ |
| Color Gradient (N-stops) | ✅ | ⚠️ 2-stop | ✅ N-stops |
| Scale Sprite Size over Life | ✅ | ❌ | ✅ |
| Scale Mesh Size over Life | ✅ | ❌ | ✅ |
| Rotation Rate | ✅ | ❌ | ✅ |
| Orient Mesh to Velocity | ✅ | ❌ | ✅ |
| Solve Forces & Velocity | ✅ | ✅ Euler | ✅ RK4/Verlet |
| Kill Particles in Volume | ✅ | ❌ | ✅ |
| Camera Offset | ✅ | ❌ | ✅ |
| UV Scroll | ✅ | ❌ | ✅ |

### 2.5 Renderer Modules

| Module | Niagara | HADES v0.1 | HADES v1.0 |
|---|---|---|---|
| Sprite Renderer | ✅ | ✅ | ✅ |
| Mesh Renderer (InstancedMesh) | ✅ | ❌ | ✅ |
| Ribbon Renderer | ✅ | ❌ | v2 |
| Light Renderer | ✅ | ❌ | v2 |
| Component Renderer | ✅ | ❌ | v3 |
| Additive Blending | ✅ | ✅ | ✅ |
| Normal Blending | ✅ | ✅ | ✅ |
| Multiply Blending | ✅ | ✅ | ✅ |
| Sort Mode | ✅ | ⚠️ UI only | ✅ |
| Texture Support (PNG/WebP) | ✅ | ❌ | ✅ |
| SubUV Flipbook Animation | ✅ | ❌ | ✅ |
| Emissive Multiplier (Bloom-ready) | ✅ | ✅ shader | ✅ |
| Soft Particles | ✅ | ❌ | ✅ |
| Particle Pivot Offset | ✅ | ❌ | ✅ |

---

## 3. Arquitetura Técnica

### 3.1 Data Schema — HadesSystem JSON

```typescript
interface HadesSystem {
  hadesVersion: string;          // semver
  system: {
    name: string;
    tags: string[];
    emitters: HadesEmitter[];
  };
}

interface HadesEmitter {
  id: string;
  name: string;
  enabled: boolean;
  simulationTarget: 'CPU' | 'GPU';
  emitterSpawn: {
    loop: boolean;
    duration: number;         // seconds
    delay: number;            // seconds
    loopCount?: number;       // for N-Times mode
  };
  emitterUpdate: {
    spawnRate: number;        // particles/sec
    burstSpawn?: { count: number; time: number; }[];
    emitterState: 'Active' | 'Inactive' | 'Scalability';
  };
  particleSpawn: {
    initializeParticle: {
      lifetimeMin: number;
      lifetimeMax: number;
      colorStart: Vec4;       // RGBA 0-1
      colorEnd: Vec4;
      mass: number;
      sizeMin: number;
      sizeMax: number;
      rotationMin?: number;
      rotationMax?: number;
    };
    shapeLocation: {
      type: 'sphere' | 'cylinder' | 'box' | 'cone' | 'mesh';
      radius: number;
      surfaceOnly: boolean;
      meshRef?: string;       // asset ID for mesh-based emission
    };
    addVelocity: {
      mode: 'cone' | 'linear' | 'random' | 'fromPoint';
      scale: number;
      coneAngle?: number;
      direction?: Vec3;
      pointRef?: Vec3;
    };
    spawnAtLocation?: Vec3;
  };
  particleUpdate: {
    gravityForce: Vec3;
    drag: number;
    vortexForce?: { enabled: boolean; strength: number; axis: Vec3; };
    curlNoise?: { enabled: boolean; scale: number; strength: number; frequency: number; };
    pointAttraction?: { enabled: boolean; position: Vec3; strength: number; falloff: number; };
    turbulence?: { enabled: boolean; intensity: number; frequency: number; };
    collision?: { enabled: boolean; mode: 'plane' | 'depthBuffer'; restitution: number; friction: number; };
    scaleColorOverLife: ColorGradient;
    scaleSizeOverLife?: CurveFloat;
    rotationRate?: number;
    solver: 'euler' | 'verlet' | 'rk4';
    maxVelocity: number;
    substeps: 1 | 2 | 4 | 8;
  };
  renderer: {
    type: 'sprite' | 'mesh' | 'ribbon';
    blendMode: 'additive' | 'normal' | 'multiply';
    sortMode: 'none' | 'byDistance' | 'youngestFirst' | 'oldestFirst';
    emissiveMultiplier: number;
    textureRef?: string;       // asset ID
    meshRef?: string;          // asset ID (InstancedMesh)
    subUV?: { rows: number; cols: number; frameRate: number; };
    softParticles?: boolean;
    facingMode: 'camera' | 'velocity' | 'custom';
  };
}

type Vec3 = { x: number; y: number; z: number; };
type Vec4 = { r: number; g: number; b: number; a: number; };
type ColorGradient = { stops: { position: number; color: Vec4; }[] };
type CurveFloat = { points: { time: number; value: number; }[] };
```

### 3.2 Pipeline de Execução

```
[Emitter Spawn]
      │
      ├─ Loop Behavior → determina duração e repetição
      └─ Simulation Target → CPU ou GPU path
            │
      [Emitter Update] (por frame)
            │
            ├─ Spawn Rate → gera N partículas/sec
            └─ Burst Spawn → eventos pontuais
                  │
      [Particle Spawn] (por partícula nascendo)
            │
            ├─ Initialize Particle  → lifetime, color, size, mass
            ├─ Shape Location       → posição inicial
            └─ Add Velocity         → velocidade inicial
                  │
      [Particle Update] (por partícula por frame)
            │
            ├─ Gravity Force
            ├─ Drag
            ├─ Vortex Force
            ├─ Curl Noise
            ├─ Point Attraction
            ├─ Scale Color over Life
            ├─ Scale Size over Life
            ├─ Collision Detection
            └─ Solve Forces & Velocity → integração numérica
                  │
      [Renderer Module] (por frame)
            │
            ├─ Write to GPU Buffer (positions, colors, sizes)
            └─ Draw Call → THREE.Points / InstancedMesh / Ribbon
```

### 3.3 Performance Targets

| Métrica | v0.1 (CPU) | v1.0 (CPU+GPU) | v2.0 (GPU Only) |
|---|---|---|---|
| Max partículas @ 60fps | 10,000 | 50,000 | 500,000+ |
| Latência de geração | — | — | — |
| Draw Calls por Emitter | 1 | 1 | 1 |
| Memória por partícula | ~80 bytes | ~64 bytes | ~32 bytes (VRAM) |
| WASM acceleration | ❌ | ⚠️ Opt-in | ✅ |

---

## 4. Módulos de UI — Especificação

### 4.1 Layout Principal

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: Logo | Toolbar | Status | Export                       │
├──────────────┬──────────────────────────┬───────────────────────┤
│ SYSTEM       │                          │ MODULE PROPERTIES     │
│ BROWSER      │   3D VIEWPORT            │                       │
│              │   (Three.js Canvas)      │ ▼ Emitter Spawn       │
│ ▶ System 01  │                          │ ▼ Emitter Update      │
│   ◉ Emit_01  │   [Grid] [Axes]          │ ▼ Particle Spawn      │
│   ◉ Emit_02  │   [OrbitCam]             │   ✦ Init Particle     │
│              │   [Stats HUD]            │   ◈ Shape Location    │
│ Stats Grid   │                          │   ⟶ Add Velocity      │
│ Playback     │                          │ ▼ Particle Update     │
│ Controls     │                          │   ↓ Gravity           │
│              │                          │   ≋ Drag              │
│              │                          │   ↻ Vortex            │
│              │                          │   〜 Curl Noise       │
│              │                          │   ◐ Scale Color       │
│              │                          │   ⚙ Solve Forces      │
│              │                          │ ▼ Renderer            │
├──────────────┴──────────────────────────┴───────────────────────┤
│  STATUS BAR: GPU | Draw Calls | Vertices | Version              │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Features de UI — Roadmap

**v0.1 (Prototipo Atual)**
- [x] Layout 3 colunas com painéis colapsáveis
- [x] Sistema de árvore (System Browser)
- [x] Módulos organizados por fase (Spawn / Update / Renderer)
- [x] Parâmetros numéricos com slider + input
- [x] Color pickers para start/end color
- [x] Vec3 inputs para vetores
- [x] Dropdowns para enums (Shape, VelocityMode, BlendMode)
- [x] Stats em tempo real
- [x] Playback controls (Play/Pause/Stop)
- [x] Export JSON + Download

**v0.5 (Editor Intermediário)**
- [ ] Curve Editor para CurveFloat (tamanho ao longo da vida)
- [ ] Gradient Editor com N stops de cor
- [ ] Timeline visual com keyframes
- [ ] Undo/Redo (Command Pattern)
- [ ] Drag & Drop de módulos para reordenar
- [ ] Drag & Drop de texturas (PNG/WebP)
- [ ] Importação de .obj e .glb para Mesh Renderer
- [ ] Context menu (right-click) nos emitters
- [ ] Copy/Paste de módulos entre emitters
- [ ] Módulos customizados (HLSL/GLSL sandbox)

**v1.0 (Editor Completo)**
- [ ] Node Graph (similar ao Material Editor da UE)
- [ ] GPU Simulation via Compute Shaders (GPGPU)
- [ ] Post-Processing stack (Bloom, Chromatic Aberration, Motion Blur)
- [ ] Ribbon Renderer
- [ ] Collision com Depth Buffer
- [ ] Sistema de Presets e Templates
- [ ] Asset Browser (texturas, meshes, sistemas)
- [ ] Câmeras adicionais (Orthographic, Debug)
- [ ] LOD automático baseado em distância
- [ ] Exportação para GLTF com extensão custom
- [ ] Multi-monitor / Panel detach

---

## 5. Sistema de Shaders

### 5.1 Vertex Shader — Particle Sprite

O vertex shader atual resolve:
- Posicionamento via `modelViewMatrix * vec4(position, 1.0)`
- `gl_PointSize` ajustado por distância para manter tamanho de tela consistente
- Pass-through de `aColor`, `aSize`, `aOpacity` como varyings

**Melhorias Planejadas:**
- `gl_PointSize` com clamp mínimo/máximo configurável
- Suporte a rotação por partícula via `mat2` no vertex
- Size over life via `uniform sampler1D` (curva pré-baked)

### 5.2 Fragment Shader — Sprite

O fragment shader atual resolve:
- Círculo soft com descarte de fragmentos fora do raio (`discard`)
- Core brilhante para simular emissão (bloom-ready)
- Composição por canal alpha com suporte a blending modes

**Melhorias Planejadas:**
- Suporte a texturas 2D via `uniform sampler2D uTexture`
- SubUV flipbook via `uniform vec2 uSubUV`
- Distortion FX via noise no UV space
- Soft particles via `gl_FragDepth` comparação

### 5.3 GPU Particles (Compute / GPGPU)

Para a v1.0, a simulação migra para o GPU:

```glsl
// Compute pass — simulação de física
layout (local_size_x = 256) in;

layout(std430, binding = 0) buffer ParticleBuffer {
  vec4 positions[]; // xyz = pos, w = age
  vec4 velocities[]; // xyz = vel, w = maxAge
  vec4 colors[];
  vec4 metadata[]; // x = size, y = opacity, z = flags
};

uniform float uDeltaTime;
uniform vec3  uGravity;
uniform float uDrag;

void main() {
  uint i = gl_GlobalInvocationID.x;
  if (positions[i].w >= velocities[i].w) return; // dead
  
  positions[i].w += uDeltaTime; // age
  velocities[i].xyz += uGravity * uDeltaTime;
  velocities[i].xyz *= (1.0 - uDrag * uDeltaTime);
  positions[i].xyz += velocities[i].xyz * uDeltaTime;
  // ... ScaleColor, etc.
}
```

---

## 6. HadesPlayer — Runtime Portável

O `HadesPlayer` é uma biblioteca standalone (~15kb gzip) que reproduz sistemas HADES em qualquer cena Three.js:

```javascript
import { HadesPlayer } from '@hades/player';

const player = new HadesPlayer(threeScene, threeCamera);
await player.load('effects/explosion.json');
player.play();

// API
player.pause();
player.stop();
player.setSpeed(0.5);    // slow motion
player.seekTo(2.0);      // seek para 2 segundos
player.on('complete', () => console.log('done'));
player.dispose();
```

---

## 7. Roadmap de Versões

### v0.1 — Protótipo Funcional (atual)
**Objetivo:** Validar arquitetura, UI e pipeline de dados
- CPU simulation para 10k partículas
- 5 módulos de força implementados
- Export JSON funcional
- Dark theme industrial

### v0.5 — Editor Usável
**Objetivo:** Primeira versão para uso real em projetos
- GPU simulation via GPGPU Three.js
- Ribbon Renderer
- Curve Editor e Gradient Editor
- Import de texturas e meshes
- Sistema de Templates (Fire, Smoke, Sparks, Magic)
- HadesPlayer v1

### v1.0 — Paridade Funcional com Niagara
**Objetivo:** Feature parity completo para 90% dos casos de uso
- Node Graph visual
- Compute Shaders
- Collision Detection
- Post-Processing (Bloom, CA, MB)
- Asset Browser
- Colaboração em tempo real (WebSockets)
- Export para GLTF + extensão HADES

### v2.0 — Além do Niagara
**Objetivo:** Funcionalidades nativas web sem paralelo no Niagara
- Skeletal Mesh Emission via pose streaming
- Integration com WebXR (AR/VR)
- AI-assisted effect generation
- Visual Scripting (HADES Script)
- Marketplace de efeitos

---

## 8. KPIs de Qualidade

| KPI | Meta v0.1 | Meta v1.0 |
|---|---|---|
| FPS com 10k partículas | > 60 | > 60 |
| FPS com 100k partículas | N/A (CPU) | > 60 (GPU) |
| Tamanho do bundle (KB gzip) | < 500 | < 200 (player) |
| JSON parse time | < 10ms | < 5ms |
| Tempo de exportação | < 50ms | < 10ms |
| First paint do editor | < 2s | < 1s |
| Taxa de parsing válido de JSON exportado | 100% | 100% |
| Cross-browser support | Chrome/Firefox/Edge | + Safari |

---

## 9. Tecnologias e Dependências

| Pacote | Versão | Propósito |
|---|---|---|
| three | r128+ | Rendering engine |
| @react-three/fiber | 8.x | React bindings (v0.5+) |
| @react-three/postprocessing | 2.x | Bloom, CA, MB |
| leva | latest | Debug UI |
| zustand | 4.x | State management |
| immer | 10.x | Immutable state |
| simplex-noise | 4.x | Curl Noise CPU |
| glslify | 7.x | Shader modules |
| @loaders.gl/obj | 3.x | OBJ loading |
| @loaders.gl/gltf | 3.x | GLB loading |
| idb | 8.x | Asset caching (IndexedDB) |
| vite | 5.x | Build tool |

---

## 10. Estrutura de Arquivos — v1.0 Target

```
hades/
├── index.html                     # Editor entry point
├── prd.md                         # Este documento
├── agents.md                      # Agentes de IA
│
├── src/
│   ├── core/
│   │   ├── HadesSystem.js         # System container
│   │   ├── HadesEmitter.js        # Emitter com pool de partículas
│   │   ├── HadesPlayer.js         # Runtime standalone
│   │   └── HadesSerializer.js     # JSON import/export
│   │
│   ├── modules/
│   │   ├── spawn/
│   │   │   ├── InitializeParticle.js
│   │   │   ├── ShapeLocation.js
│   │   │   └── AddVelocity.js
│   │   ├── update/
│   │   │   ├── GravityForce.js
│   │   │   ├── Drag.js
│   │   │   ├── VortexForce.js
│   │   │   ├── CurlNoise.js
│   │   │   ├── PointAttraction.js
│   │   │   ├── Turbulence.js
│   │   │   ├── ScaleColorOverLife.js
│   │   │   ├── ScaleSizeOverLife.js
│   │   │   └── SolveForcesAndVelocity.js
│   │   └── renderer/
│   │       ├── SpriteRenderer.js
│   │       ├── MeshRenderer.js
│   │       └── RibbonRenderer.js
│   │
│   ├── shaders/
│   │   ├── particle.vert.glsl
│   │   ├── particle.frag.glsl
│   │   ├── ribbon.vert.glsl
│   │   ├── ribbon.frag.glsl
│   │   └── compute/
│   │       ├── simulate.comp.glsl
│   │       └── sort.comp.glsl
│   │
│   ├── ui/
│   │   ├── Editor.jsx             # Layout principal
│   │   ├── panels/
│   │   │   ├── SystemBrowser.jsx
│   │   │   ├── Viewport.jsx
│   │   │   └── ModulePanel.jsx
│   │   ├── modules/
│   │   │   ├── EmitterSpawnPanel.jsx
│   │   │   ├── EmitterUpdatePanel.jsx
│   │   │   ├── ParticleSpawnPanel.jsx
│   │   │   └── ParticleUpdatePanel.jsx
│   │   └── components/
│   │       ├── CurveEditor.jsx
│   │       ├── GradientEditor.jsx
│   │       ├── Vec3Input.jsx
│   │       ├── ParamSlider.jsx
│   │       └── ColorPicker.jsx
│   │
│   ├── store/
│   │   ├── systemStore.js         # Zustand store
│   │   └── historyStore.js        # Undo/Redo
│   │
│   └── utils/
│       ├── noise.js               # Simplex/Perlin/Curl
│       ├── math.js                # Vec3, quaternion, curves
│       └── assets.js              # Texture/Mesh loading
│
└── public/
    ├── templates/                 # JSON templates prontos
    │   ├── fountain.json
    │   ├── fire.json
    │   ├── smoke.json
    │   ├── explosion.json
    │   └── magic_sparkle.json
    └── textures/
        ├── spark.png
        ├── smoke_tile.png
        └── flare.png
```
