import { HadesEmitter } from './HadesEmitter.js';
import { cloneData } from '../utils/math.js';

export class HadesSystem {
  constructor(data) {
    this.data = cloneData(data);
    this.emitters = this.data.system.emitters.map((emitterConfig) => new HadesEmitter(emitterConfig));
  }

  update(dt) {
    this.emitters.forEach((emitter) => emitter.update(dt));
  }

  reset() {
    this.emitters.forEach((emitter) => emitter.reset());
  }

  setEmitterConfig(index, config) {
    this.data.system.emitters[index] = cloneData(config);
    this.emitters[index].updateConfig(config);
  }

  addEmitter(config) {
    this.data.system.emitters.push(cloneData(config));
    const emitter = new HadesEmitter(config);
    this.emitters.push(emitter);
    return emitter;
  }

  removeEmitter(index) {
    const [removedConfig] = this.data.system.emitters.splice(index, 1);
    const [removedEmitter] = this.emitters.splice(index, 1);
    if (removedEmitter) {
      removedEmitter.dispose();
    }
    return { removedConfig, removedEmitter };
  }

  toJSON() {
    return {
      hadesVersion: this.data.hadesVersion,
      system: {
        ...cloneData(this.data.system),
        exportedAt: new Date().toISOString(),
        emitters: this.emitters.map((emitter) => emitter.toJSON())
      }
    };
  }
}
