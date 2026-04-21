import { masterQueue } from '../data/mock-data.js';
import { renderSectionHeader, renderPill } from '../ui/components.js';

export function renderMasterDashboard() {
  return `
    ${renderSectionHeader(
      'Painel do Mestre',
      'Fila inicial de homologacao com alertas do sistema e visao operacional da mesa.'
    )}
    <section class="card-grid">
      ${masterQueue
        .map(
          (item) => `
            <article class="panel">
              <div class="split-line">
                <strong>${item.character}</strong>
                ${renderPill(item.priority, item.priority === 'Alta' ? 'danger' : 'warning')}
              </div>
              <p class="muted">${item.issue}</p>
              <div class="cta-row">
                <button class="ghost-button">Revisar</button>
                <button class="primary-button">Homologar</button>
              </div>
            </article>
          `
        )
        .join('')}
    </section>
  `;
}
