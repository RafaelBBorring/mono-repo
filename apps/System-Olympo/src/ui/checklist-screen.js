import { checklistItems } from '../data/mock-data.js';
import { renderSectionHeader } from './components.js';

export function renderChecklistScreen() {
  return `
    ${renderSectionHeader(
      'Checklist do PRD',
      'Resumo do que ja foi entregue nesta primeira versao do projeto em relacao ao escopo do documento.'
    )}
    <section class="panel">
      <div class="checklist">
        ${checklistItems
          .map(
            (item) => `
              <div class="check-item ${item.status}">
                <strong>${item.status === 'done' ? 'Concluido' : item.status === 'partial' ? 'Parcial' : 'Pendente'}</strong>
                <p>${item.label}</p>
              </div>
            `
          )
          .join('')}
      </div>
    </section>
  `;
}
