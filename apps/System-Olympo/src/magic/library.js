import { magicLibrary } from '../data/mock-data.js';
import { renderSectionHeader, renderPill } from '../ui/components.js';

function renderGroup(title, items) {
  return `
    <article class="panel">
      <div class="split-line">
        <div>
          <p class="eyebrow">Catalogo</p>
          <h3>${title}</h3>
        </div>
        ${renderPill(`${items.length} itens`)}
      </div>
      <div class="magic-list">
        ${items
          .map(
            (item) => `
              <div class="magic-item">
                <strong>${item.title}</strong>
                <span>${item.tier}</span>
                <p class="muted">${item.description}</p>
                <small>${item.cost}</small>
              </div>
            `
          )
          .join('')}
      </div>
    </article>
  `;
}

export function renderMagicLibrary() {
  return `
    ${renderSectionHeader(
      'Biblioteca Magica',
      'Feiticos, runas e rituais com estrutura inicial de consulta e base para uploads futuros.'
    )}
    <section class="three-column">
      ${renderGroup('Feiticos', magicLibrary.feiticos)}
      ${renderGroup('Runas', magicLibrary.runas)}
      ${renderGroup('Rituais', magicLibrary.rituais)}
    </section>
  `;
}
