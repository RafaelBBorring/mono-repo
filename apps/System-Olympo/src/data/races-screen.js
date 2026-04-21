import { renderSectionHeader } from '../ui/components.js';

export function renderRacesScreen() {
  return `
    ${renderSectionHeader(
      'Tela de Racas',
      'Placeholder de lore conforme o PRD, pronto para receber regras sistemicas em versao futura.'
    )}
    <section class="panel">
      <p class="eyebrow">Lore base</p>
      <h3>Catalogo de racas em preparacao</h3>
      <p class="muted">
        Esta tela ja existe no fluxo do produto e comunica que as racas faram parte da expansao
        sistemica posterior, sem bloquear o restante do portal.
      </p>
    </section>
  `;
}
