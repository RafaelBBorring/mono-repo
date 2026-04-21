import { sampleCharacters } from '../data/mock-data.js';
import { buildValidationReport } from '../character/validator.js';
import { renderSectionHeader } from '../ui/components.js';

export function renderBalancer() {
  const character = sampleCharacters[0];
  const report = buildValidationReport(character);

  return `
    ${renderSectionHeader(
      'Balanceador IA',
      'Modo demonstrativo do fluxo de analise e criacao de habilidades, sem conexao externa nesta etapa.'
    )}
    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Analise automatica</p>
        <h3>Homologacao de ${character.name}</h3>
        <div class="validation-grid">
          ${report
            .map(
              (item) => `
                <div class="validation-item ${item.ok ? 'ok' : 'warn'}">
                  <strong>${item.code}</strong>
                  <p>${item.message}</p>
                </div>
              `
            )
            .join('')}
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">Prompt pronto</p>
        <h3>Assistente de habilidade</h3>
        <div class="prompt-box">
          <p>Classe: Mistico</p>
          <p>Nivel: 18</p>
          <p>Tipo: Ativa Media</p>
          <p>Conceito: Tecelagem arcana com dano e controle.</p>
        </div>
        <div class="helper-box">
          O componente ja reserva o fluxo de criacao guiada. A integracao real com IA ficou fora
          do escopo atual, conforme solicitado.
        </div>
      </article>
    </section>
  `;
}
