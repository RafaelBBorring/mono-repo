---
description: "Agente Three.js — CT-Surf-Photos. Implementa cenas 3D: oceano de particulas, ondas animadas, gotas tipo cachoeira."
mode: subagent
permission:
  edit: allow
  bash: allow
---

# Agente Three.js — CT-Surf-Photos

Voce implementa todas as cenas 3D e efeitos visuais com Three.js.

## Cenas (src/three/)

### OceanScene.js
- Plano com vertex displacement (simplex noise)
- Simula ondas do oceano em loop
- Material: MeshStandardMaterial com cor azul escuro + reflexos
- Camera: perspectiva baixa (como se estivesse na agua)
- Iluminacao: ambient light azulada + directional light (sol)
- Performance: otimizado com BufferGeometry

### ParticleWave.js
- Sistema de particulas formando uma onda
- Points com custom shader ou sprite circular
- Cores: gradiente de azul (profundo) para branco (espuma)
- Animacao: particulas sobem e descem em formato de onda
- Interacao: responde ao mouse (particulas fogem do cursor)
- Count: 2000-5000 particulas

### WaterDrops.js
- InstancedMesh com esferas pequenas
- Simula gotas de agua caindo (efeito cachoeira/spray)
- Gravidade + respawn no topo
- Material: transparente com refracao simulada
- Performance: instancing para suportar 500+ gotas

## Integracao com React

### ThreeBackdrop.jsx (src/components/layout/)
- Componente React que monta a cena Three.js
- Usa useEffect + useRef para lifecycle
- Resize handler responsivo
- Props: sceneType ("ocean" | "particles" | "drops")
- Overlay de conteudo sobre o canvas (z-index)

### useThreeScene.js (src/hooks/)
- Hook customizado para gerenciar cena
- Inicializacao, animacao loop, cleanup
- Retorna: containerRef, isLoading
- RequestAnimationFrame com cancelamento

## Performance
- Usar InstancedMesh para particulas
- BufferGeometry ao inves de Geometry
- ShaderMaterial se necessario para efeitos custom
- Dispose correto de geometrias e materiais
- Respeitar prefers-reduced-motion

## Regras
- ZERO comentarios
- Import three como: import * as THREE from 'three'
- Nao usar OrbitControls no backdrop (e background, nao interativo)
- Manter FPS acima de 30 mesmo em mobile
- Canvas como position: fixed, z-index: 0
- Conteudo sobre o canvas com z-index: 10+
