import { deriveCharacter } from '../character/calculator.js';
import { classProfiles, triageCatalog } from '../data/mock-data.js';
import { renderPill, renderStatCard } from '../ui/components.js';

function renderCharacterCard(character, index) {
  const derived = deriveCharacter(character);
  const profile = classProfiles[character.classId];
  const triage = (triageCatalog[character.classId] ?? []).find(item => item.id === character.triageId);

  const classIcons = { guerreiro: 'fa-shield-halved', operativo: 'fa-crosshairs', mistico: 'fa-hat-wizard' };

  return `
    <article class="character-vault-card" style="--class-accent:${profile.accent}; animation-delay: ${index * 0.08}s; animation: cardEnter 0.5s cubic-bezier(0.4,0,0.2,1) ${index * 0.08}s both;">
      <div class="character-vault-top">
        <div class="avatar-seal ${profile.aura}">
          ${character.avatar
            ? `<img src="${character.avatar}" alt="${character.name}" />`
            : `<i class="fas ${classIcons[character.classId] || 'fa-user'}"></i>`
          }
        </div>
        <div class="char-info">
          <h3>${character.name}</h3>
          <p class="char-meta">
            <i class="fas ${classIcons[character.classId] || 'fa-user'}"></i>
            ${profile.name} · ${triage?.name ?? 'Sem triagem'} · Nivel ${character.level}
          </p>
        </div>
      </div>
      <div class="character-vault-stats">
        ${renderStatCard('HP', derived.totalHp, 'vida', 'danger')}
        ${renderStatCard('Energia', derived.energyTotal, 'energia', 'info')}
        ${renderStatCard('PE', derived.peTotal, 'poder', 'neutral')}
      </div>
      <div class="cta-row">
        <a class="ghost-button inline-link" href="#/character/${character.id}"><i class="fas fa-eye"></i> Ver</a>
        <a class="primary-button inline-link" href="#/character/${character.id}/edit"><i class="fas fa-pen"></i> Editar</a>
      </div>
    </article>
  `;
}

export function renderDashboard({ state }) {
  return {
    html: `
      <div class="dashboard-header">
        <div>
          <p class="eyebrow"><i class="fas fa-dungeon"></i> Biblioteca de Personagens</p>
          <h2>Suas Fichas</h2>
          <p>${state.characters.length} personagem(ns) forjado(s) ate agora</p>
        </div>
        <div class="dashboard-actions">
          <a class="ghost-button inline-link" href="#/system"><i class="fas fa-book"></i> Sistema</a>
          <a class="primary-button inline-link" href="#/character/new"><i class="fas fa-plus"></i> Nova Ficha</a>
        </div>
      </div>

      <section class="vault-grid">
        ${state.characters.map((character, index) => renderCharacterCard(character, index)).join('')}

        <article class="character-vault-card add-card">
          <div class="add-icon"><i class="fas fa-plus"></i></div>
          <h3>Nova Forja</h3>
          <p class="card-copy">Crie um novo personagem com o wizard de criacao passo a passo</p>
          <a class="primary-button inline-link" href="#/character/new"><i class="fas fa-hammer"></i> Abrir Forja</a>
        </article>
      </section>
    `
  };
}
