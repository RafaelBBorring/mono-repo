import { HadesSystem } from '../core/HadesSystem.js';
import { cloneData } from '../utils/math.js';

export function createSystemStore(initialData) {
  const listeners = new Set();
  const system = new HadesSystem(initialData);
  const state = {
    system,
    selectedEmitterIndex: 0,
    running: true,
    elapsedTime: 0,
    fps: 60
  };

  function emit() {
    listeners.forEach((listener) => listener(getState()));
  }

  function getState() {
    return {
      ...state,
      selectedEmitterConfig: cloneData(state.system.data.system.emitters[state.selectedEmitterIndex]),
      emitters: state.system.data.system.emitters.map((emitter) => cloneData(emitter))
    };
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    },
    getState,
    setRunning(running) {
      state.running = running;
      emit();
    },
    setElapsedTime(elapsedTime, notify = true) {
      state.elapsedTime = elapsedTime;
      if (notify) emit();
    },
    setFps(fps, notify = true) {
      state.fps = fps;
      if (notify) emit();
    },
    selectEmitter(index) {
      state.selectedEmitterIndex = index;
      emit();
    },
    patchEmitter(index, patcher) {
      const current = cloneData(state.system.data.system.emitters[index]);
      patcher(current);
      state.system.setEmitterConfig(index, current);
      emit();
    },
    addEmitter(emitterConfig) {
      const emitter = state.system.addEmitter(emitterConfig);
      emit();
      return emitter;
    },
    removeEmitter(index) {
      if (state.system.emitters.length <= 1) return null;
      const removed = state.system.removeEmitter(index);
      if (state.selectedEmitterIndex >= state.system.emitters.length) {
        state.selectedEmitterIndex = Math.max(0, state.system.emitters.length - 1);
      } else if (index < state.selectedEmitterIndex) {
        state.selectedEmitterIndex -= 1;
      }
      emit();
      return removed;
    },
    reset() {
      state.elapsedTime = 0;
      state.system.reset();
      emit();
    }
  };
}
