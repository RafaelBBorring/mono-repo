/**
 * Sistema de Feedback Visual em Tempo Real para o Wizard
 * Mostra ao usuário como suas escolhas impactam os stats do personagem
 */

import { deriveCharacter } from './calculator.js';

/**
 * Cria um painel de feedback visual que mostra stats derivados em tempo real
 */
export function createLiveStatsPanel(draft) {
  const derived = deriveCharacter(draft);
  const classProfile = Object.values(require('../data/mock-data.js').classProfiles)
    .find(p => p.id === draft.classId);

  if (!classProfile) return '';

  return `
    <div class="live-stats-panel">
      <div class="live-stats-header">
        <p class="eyebrow"><i class="fas fa-bolt"></i> Predição de Stats</p>
        <p class="live-stats-subtitle">Como suas escolhas afetam o personagem</p>
      </div>

      <div class="live-stats-grid">
        <div class="live-stat-card hp">
          <div class="stat-icon"><i class="fas fa-heart"></i></div>
          <div class="stat-info">
            <span class="stat-label">Vida Total</span>
            <span class="stat-value">${derived.totalHp}</span>
            <small>${derived.baseHp} base + ${(derived.totalHp - derived.baseHp)} dos bônus</small>
          </div>
        </div>

        <div class="live-stat-card energy">
          <div class="stat-icon"><i class="fas fa-bolt"></i></div>
          <div class="stat-info">
            <span class="stat-label">Energia</span>
            <span class="stat-value">${derived.energyTotal}</span>
            <small>Nível ${draft.level} · ${derived.tier.label}</small>
          </div>
        </div>

        <div class="live-stat-card damage">
          <div class="stat-icon"><i class="fas fa-sword"></i></div>
          <div class="stat-info">
            <span class="stat-label">Dano Base</span>
            <span class="stat-value">${derived.damageBase}</span>
            <small>${classProfile.baseDamage} da classe</small>
          </div>
        </div>

        <div class="live-stat-card ca">
          <div class="stat-icon"><i class="fas fa-shield"></i></div>
          <div class="stat-info">
            <span class="stat-label">Classe de Armadura</span>
            <span class="stat-value">${derived.ca}</span>
            <small>10 + MOD DES + MOD CON</small>
          </div>
        </div>

        <div class="live-stat-card reactions">
          <div class="stat-icon"><i class="fas fa-clock"></i></div>
          <div class="stat-info">
            <span class="stat-label">Reações/Rodada</span>
            <span class="stat-value">${derived.reactions}</span>
            <small>1 + MOD DES ÷ 5</small>
          </div>
        </div>

        <div class="live-stat-card pe">
          <div class="stat-icon"><i class="fas fa-sparkles"></i></div>
          <div class="stat-info">
            <span class="stat-label">Pontos de Esforço</span>
            <span class="stat-value">${derived.peTotal}</span>
            <small>Recursos por combate</small>
          </div>
        </div>
      </div>

      <div class="live-stats-details">
        <div class="detail-row">
          <span class="detail-label">HP por Nível</span>
          <span class="detail-value">+${derived.hpPerLevel}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Período de Combate</span>
          <span class="detail-value">${derived.tier.label}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Bônus de Recursos</span>
          <span class="detail-value">+${Math.floor(draft.level / 4)}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Atualiza o painel de feedback visual quando dados mudam
 */
export function updateLiveStats(root, draft) {
  const panel = root.querySelector('.live-stats-panel');
  if (!panel) return;

  const newPanel = createLiveStatsPanel(draft);
  panel.innerHTML = newPanel.split('</div>')[0] + '</div>' + newPanel.split('<div class="live-stats-details">')[1];
}

/**
 * Adiciona indicadores visuais de validação aos controles
 */
export function applyValidationVisuals(root, draft, derived) {
  // Indicador de atributos desbalanceados
  root.querySelectorAll('[data-attr-container]').forEach(container => {
    const attr = derived.attributes[container.dataset.attrContainer];
    if (attr.total > 20) {
      container.classList.add('imbalanced');
    } else {
      container.classList.remove('imbalanced');
    }
  });

  // Indicador de nível inválido
  const levelInput = root.querySelector('[data-level-input]');
  if (levelInput) {
    const level = Number(levelInput.value);
    if (level < 1 || level > 30) {
      levelInput.classList.add('invalid');
    } else {
      levelInput.classList.remove('invalid');
    }
  }

  // Indicador de perícias excedidas
  const skillCheckboxes = root.querySelectorAll('[data-skill-checkbox]');
  const selectedSkills = Array.from(skillCheckboxes).filter(c => c.checked).length;
  const maxSkills = derived.skillsAllowed || 3;
  
  skillCheckboxes.forEach(checkbox => {
    if (!checkbox.checked && selectedSkills >= maxSkills) {
      checkbox.disabled = true;
    } else {
      checkbox.disabled = false;
    }
  });

  // Indicador de módulos excedidos
  const moduleCheckboxes = root.querySelectorAll('[data-module-checkbox]');
  const selectedModules = Array.from(moduleCheckboxes).filter(c => c.checked).length;
  const maxModules = derived.modulesAllowed || 2;

  moduleCheckboxes.forEach(checkbox => {
    if (!checkbox.checked && selectedModules >= maxModules) {
      checkbox.disabled = true;
      checkbox.closest('.module-card').classList.add('disabled');
    } else {
      checkbox.disabled = false;
      checkbox.closest('.module-card').classList.remove('disabled');
    }
  });
}
