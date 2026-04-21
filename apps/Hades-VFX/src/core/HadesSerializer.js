export class HadesSerializer {
  static export(system) {
    return JSON.stringify(system.toJSON(), null, 2);
  }

  static download(system) {
    const blob = new Blob([HadesSerializer.export(system)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'HadesSystem.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
