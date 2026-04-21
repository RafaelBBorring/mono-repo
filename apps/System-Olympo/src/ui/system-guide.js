import { evolutionMilestones, systemGuideSections } from '../data/mock-data.js';
import { renderSectionLead, renderTable, renderBackButton } from './components.js';

export function renderSystemGuide() {
  return {
    html: `
      ${renderBackButton('#/dashboard', 'Voltar ao Hall')}
      ${renderSectionLead(
        'Atlas visual',
        'Sistema explicado tim-tim por tim-tim',
        'Resumo visual das faixas, tetos, marcos de evolucao e pontos que o criador de ficha precisa respeitar.'
      )}
      <section class="guide-grid">
        ${systemGuideSections.map(section => renderTable(section)).join('')}
      </section>
      <section class="milestone-grid">
        ${evolutionMilestones.map(milestone => `
          <article class="milestone-card panel-shell">
            <div class="split-line">
              <div>
                <p class="eyebrow"><i class="fas fa-trophy"></i> Nivel ${milestone.level}</p>
                <h3>${milestone.title}</h3>
              </div>
              <span class="ui-pill info">${milestone.summary}</span>
            </div>
            <div class="choice-grid">
              ${milestone.rewards.map(reward => `
                <div class="choice-card">
                  <strong><i class="fas fa-gift"></i> ${reward.title}</strong>
                  <p>${reward.description}</p>
                </div>
              `).join('')}
            </div>
          </article>
        `).join('')}
      </section>
    `
  };
}
