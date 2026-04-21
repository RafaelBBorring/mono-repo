/**
 * Componentes melhorados para o Wizard de Criação
 * Focados em UX, estética e feedback visual
 */

import { renderPill } from '../ui/components.js';
import { attributeLabels, attributeLore, attributeOrder } from '../data/mock-data.js';

// ==================== STEP 1: CLASSE ====================
// Melhorias: Tipografia legível, botão voltar visível, cards com melhor contraste

export function renderClassStep(draft, classProfiles) {
  const classIcons = {
    guerreiro: 'fa-shield-halved',
    operativo: 'fa-crosshairs',
    mistico: 'fa-hat-wizard'
  };

  return `
    <div class="wizard-header">
      <p class="eyebrow"><i class="fas fa-shield-halved"></i> Escolha sua Classe</p>
      <h2 class="wizard-title">Defina seu Destino</h2>
      <p class="wizard-subtitle">Cada classe molda o estilo de combate, recursos e identidade mecânica do personagem.</p>
    </div>

    <div class="class-selector-grid">
      ${Object.values(classProfiles).map(profile => `
        <button class="class-card ${draft.classId === profile.id ? 'selected' : ''}" data-class="${profile.id}">
          <div class="class-card-header">
            <div class="class-icon-wrapper">
              <i class="fas ${classIcons[profile.id]}"></i>
            </div>
            <div class="class-info">
              <h3 class="class-name">${profile.name}</h3>
              <p class="class-fantasy">${profile.fantasy}</p>
            </div>
          </div>
          
          <div class="class-card-metrics">
            <div class="metric-row">
              <span class="metric-label"><i class="fas fa-heart"></i> Vida Base</span>
              <span class="metric-value">${profile.baseHp}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label"><i class="fas fa-arrow-up"></i> Por Nível</span>
              <span class="metric-value">+${profile.hpPerLevel}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label"><i class="fas fa-bolt"></i> Energia</span>
              <span class="metric-value">${profile.energyBase}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label"><i class="fas fa-list-check"></i> Perícias</span>
              <span class="metric-value">${profile.skills}</span>
            </div>
          </div>

          <div class="class-card-footer">
            <span class="selection-indicator">
              <i class="fas fa-check"></i> Selecionado
            </span>
          </div>
        </button>
      `).join('')}
    </div>
  `;
}

// ==================== STEP 2: ATRIBUTOS ====================
// Melhorias: Design dinâmico, display claro de bônus, feedback visual de valores

export function renderAttributesStep(draft, derived, getAvailableSkeletonPoints) {
  const available = getAvailableSkeletonPoints(draft);
  const spent = derived.spentSkeleton;
  const remaining = available - spent;

  return `
    <div class="wizard-header">
      <p class="eyebrow"><i class="fas fa-dice-d20"></i> Distribuição Estrutural</p>
      <h2 class="wizard-title">Forje seus Atributos</h2>
      <p class="wizard-subtitle">Cada ponto molda o potencial. Distribua com sabedoria — você tem ${remaining}/${available} pontos de esqueleto extra.</p>
    </div>

    <div class="attribute-distribution-board">
      <div class="distribution-header">
        <div class="skeleton-meter">
          <div class="meter-bar">
            <div class="meter-fill" style="width: ${(spent / available) * 100}%"></div>
          </div>
          <span class="meter-label">
            <strong>${spent}</strong> / ${available} Pontos de Esqueleto
          </span>
        </div>
      </div>

      <div class="attribute-cards-grid">
        ${attributeOrder.map(key => {
          const attr = derived.attributes[key];
          const arrayVal = draft.arrayAssignments[key] || 10;
          const bonusVal = draft.bonusAssignments[key] || 0;
          const total = attr.total;
          const modifier = attr.modifier;
          
          return `
            <article class="attribute-card" data-attr-container="${key}">
              <div class="attr-header">
                <h4 class="attr-name">${attributeLabels[key]}</h4>
                <div class="attr-total-badge">${total}</div>
              </div>

              <p class="attr-lore">${attributeLore[key]}</p>

              <div class="attr-composition">
                <div class="comp-section">
                  <label class="comp-label">Array Base</label>
                  <select data-array-attribute="${key}" class="array-select">
                    ${[8, 10, 12, 13, 14, 15].map(value =>
                      `<option value="${value}" ${arrayVal === value ? 'selected' : ''}>
                        ${value}
                      </option>`
                    ).join('')}
                  </select>
                  <span class="comp-value">${arrayVal}</span>
                </div>

                <div class="comp-section">
                  <label class="comp-label">Bônus Extra</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="${available}" 
                    value="${bonusVal}" 
                    data-bonus-attribute="${key}" 
                    class="bonus-input"
                    placeholder="0"
                  />
                  <span class="comp-value">+${bonusVal}</span>
                </div>

                <div class="comp-divider"></div>

                <div class="comp-result">
                  <span class="result-label">Total</span>
                  <span class="result-value">${total}</span>
                </div>
              </div>

              <div class="attr-modifier">
                <span class="mod-label">Modificador</span>
                <span class="mod-badge ${modifier >= 0 ? 'positive' : 'negative'}">
                  ${modifier >= 0 ? '+' : ''}${modifier}
                </span>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ==================== STEP 3 PARTE A: TRIAGENS ====================
// Melhorias: Aba dedicada, descrições expandidas, habilidades visíveis

export function renderTriagesPanel(draft, triageCatalog, classProfiles) {
  const triages = triageCatalog[draft.classId] ?? [];
  const selectedTriage = triages.find(t => t.id === draft.triageId);

  return `
    <div class="triages-panel">
      <div class="panel-header">
        <h3 class="panel-title"><i class="fas fa-sitemap"></i> Triagem Especializada</h3>
        <p class="panel-description">Escolha uma triagem que define seu estilo de combate. Cada uma oferece habilidades únicas.</p>
      </div>

      <div class="triages-grid">
        ${triages.map(triage => `
          <button class="triage-card ${draft.triageId === triage.id ? 'selected' : ''}" data-triageId="${triage.id}">
            <div class="triage-header">
              <h4 class="triage-name">${triage.name}</h4>
              <span class="triage-tag">${triage.category || 'Especialista'}</span>
            </div>

            <p class="triage-fantasy">${triage.fantasy || 'Especialista em combate'}</p>

            <div class="triage-abilities">
              <p class="abilities-label">Habilidades desbloqueadas:</p>
              <ul class="ability-list">
                ${(triage.abilities || []).map(ability => `
                  <li class="ability-item">
                    <i class="fas fa-check"></i>
                    <span>${ability}</span>
                  </li>
                `).join('')}
              </ul>
            </div>

            <div class="triage-bonuses">
              ${triage.bonusDescription ? `
                <p class="bonus-text">
                  <i class="fas fa-star"></i> ${triage.bonusDescription}
                </p>
              ` : ''}
            </div>
          </button>
        `).join('')}
      </div>

      ${selectedTriage ? `
        <div class="triages-detail-card">
          <div class="detail-header">
            <h4>${selectedTriage.name}</h4>
            <span class="detail-tag">${selectedTriage.category || 'Especialista'}</span>
          </div>
          <div class="detail-content">
            <p class="detail-description">${selectedTriage.fullDescription || selectedTriage.fantasy || 'Especialista em combate corporativo.'}</p>
            
            ${selectedTriage.abilities && selectedTriage.abilities.length > 0 ? `
              <div class="detail-abilities">
                <h5>Habilidades da Triagem</h5>
                <div class="abilities-grid">
                  ${selectedTriage.abilities.map((ability, idx) => `
                    <div class="ability-detail">
                      <span class="ability-number">${idx + 1}</span>
                      <span class="ability-name">${ability}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ==================== STEP 3 PARTE B: PERÍCIAS ====================
// Melhorias: Tabela moderna, responsividade, modificadores dinâmicos, estrelas de treinamento

export function renderSkillsPanel(draft, derived, skillCatalog, attributeOrder) {
  const skillsAllowed = derived.skillsAllowed || 3;
  const selected = draft.trainedSkills || [];
  const remaining = skillsAllowed - selected.length;

  // Map de habilidades para seus atributos relacionados
  const skillAttributeMap = {
    'Lutar': ['FOR', 'DES'],
    'Bloqueio': ['FOR', 'CON'],
    'Atletismo': ['FOR', 'DES', 'CON'],
    'Fortitude': ['CON'],
    'Percepção': ['INT', 'APA'],
    'Furtividade': ['DES', 'INT'],
    'Pontaria': ['DES', 'INT'],
    'Sobrevivência': ['INT', 'AM'],
    'Conhecimento': ['INT', 'AM'],
    'Investigação': ['INT', 'APA'],
    'Intimidar': ['FOR', 'APA'],
    'Diplomacia': ['APA', 'AM']
  };

  return `
    <div class="skills-panel">
      <div class="panel-header">
        <h3 class="panel-title"><i class="fas fa-list-check"></i> Perícias Treinadas</h3>
        <p class="panel-description">Escolha as perícias em que seu personagem é especialista. Cada uma é vinculada a atributos que aumentam seus modificadores.</p>
      </div>

      <div class="skills-quota">
        <div class="quota-bar">
          <div class="quota-fill" style="width: ${(selected.length / skillsAllowed) * 100}%"></div>
        </div>
        <span class="quota-text">
          <strong>${selected.length}</strong> / ${skillsAllowed} perícias
          ${remaining > 0 ? `<span class="remaining">(${remaining} restantes)</span>` : ''}
        </span>
      </div>

      <table class="skills-table">
        <thead>
          <tr>
            <th class="col-select"></th>
            <th class="col-skill">Perícia</th>
            <th class="col-attributes">Atributos Relacionados</th>
            <th class="col-modifier">Modificador</th>
            <th class="col-training">Grau</th>
          </tr>
        </thead>
        <tbody>
          ${skillCatalog.map(skill => {
            const isSelected = selected.includes(skill);
            const attrs = skillAttributeMap[skill] || [];
            
            // Calcula modificador baseado nos atributos da perícia
            let totalMod = 0;
            attrs.forEach(attrCode => {
              const attrKey = attrCode.toLowerCase().replace('á', 'a');
              const attr = derived.attributes[attrKey];
              if (attr) totalMod += attr.modifier;
            });
            const avgMod = attrs.length > 0 ? Math.floor(totalMod / attrs.length) : 0;

            return `
              <tr class="skill-row ${isSelected ? 'selected' : ''}">
                <td class="col-select">
                  <input 
                    type="checkbox" 
                    value="${skill}" 
                    data-skill-checkbox
                    ${isSelected ? 'checked' : ''}
                    ${!isSelected && selected.length >= skillsAllowed ? 'disabled' : ''}
                    class="skill-checkbox"
                  />
                </td>
                <td class="col-skill">
                  <span class="skill-name">${skill}</span>
                </td>
                <td class="col-attributes">
                  <div class="attribute-badges">
                    ${attrs.map(attrCode => `
                      <span class="attr-badge">${attrCode}</span>
                    `).join('')}
                  </div>
                </td>
                <td class="col-modifier">
                  <span class="modifier-value ${avgMod >= 0 ? 'positive' : 'negative'}">
                    ${avgMod >= 0 ? '+' : ''}${avgMod}
                  </span>
                </td>
                <td class="col-training">
                  <div class="training-stars">
                    ${[1, 2, 3].map(level => `
                      <button class="training-star" data-skill="${skill}" data-level="${level}" title="Grau ${level}">
                        <i class="fas fa-star"></i>
                      </button>
                    `).join('')}
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ==================== STEP 3 PARTE C: NÍVEL ====================
// Melhoria: Input de texto com validação, slider interativo, ou botões mais claros

export function renderLevelPanel(draft) {
  const currentLevel = parseInt(draft.level) || 1;

  return `
    <div class="level-panel">
      <div class="panel-header">
        <h3 class="panel-title"><i class="fas fa-arrow-up-1-9"></i> Nível de Experiência</h3>
        <p class="panel-description">Defina o nível inicial do seu personagem. Afeta recursos, marcos de evolução e habilidades disponíveis.</p>
      </div>

      <div class="level-selector">
        <div class="level-input-group">
          <input 
            type="number" 
            min="1" 
            max="30" 
            value="${currentLevel}"
            data-level-input
            class="level-input"
          />
          <span class="level-unit">/ 30</span>
        </div>

        <div class="level-slider-container">
          <input 
            type="range" 
            min="1" 
            max="30" 
            value="${currentLevel}"
            data-level-slider
            class="level-slider"
          />
        </div>

        <div class="level-tier-badge">
          ${currentLevel <= 7 ? `
            <span class="tier-label">Iniciante</span>
            <span class="tier-range">Níveis 1-7</span>
          ` : currentLevel <= 15 ? `
            <span class="tier-label">Intermediário</span>
            <span class="tier-range">Níveis 8-15</span>
          ` : currentLevel <= 22 ? `
            <span class="tier-label">Veterano</span>
            <span class="tier-range">Níveis 16-22</span>
          ` : `
            <span class="tier-label">Lendário</span>
            <span class="tier-range">Níveis 23-30</span>
          `}
        </div>
      </div>

      <div class="level-milestones">
        <p class="milestones-label">Marcos de Evolução desbloqueados:</p>
        <div class="milestones-list">
          ${[4, 8, 12, 16, 20].filter(m => m <= currentLevel).map(milestone => `
            <span class="milestone-badge unlocked">Nível ${milestone}</span>
          `).join('')}
          ${[4, 8, 12, 16, 20].filter(m => m > currentLevel).map(milestone => `
            <span class="milestone-badge locked">Nível ${milestone}</span>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ==================== STEP 3 PARTE D: MÓDULOS ====================
// Melhoria: Página dedicada, requisitos claros, quantidade disponível

export function renderModulesPanel(draft, derived, moduleCatalog) {
  const selectedCount = (draft.moduleIds || []).length;
  const available = derived.modulesAllowed || 2;

  return `
    <div class="modules-panel">
      <div class="panel-header">
        <h3 class="panel-title"><i class="fas fa-microchip"></i> Módulos de Evolução</h3>
        <p class="panel-description">Módulos são aprimoramentos permanentes que redefinem seu personagem. Escolha com cuidado.</p>
      </div>

      <div class="modules-quota">
        <div class="quota-bar">
          <div class="quota-fill" style="width: ${(selectedCount / available) * 100}%"></div>
        </div>
        <span class="quota-text">
          <strong>${selectedCount}</strong> / ${available} módulos selecionados
        </span>
      </div>

      <div class="modules-grid">
        ${moduleCatalog.map(module => {
          const isSelected = (draft.moduleIds || []).includes(module.id);
          const canSelect = isSelected || selectedCount < available;

          return `
            <article class="module-card ${isSelected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''}">
              <div class="module-header">
                <h4 class="module-name">${module.name}</h4>
                <span class="module-category">${module.category}</span>
              </div>

              <p class="module-description">${module.description}</p>

              <div class="module-effects">
                <p class="effects-label">Efeitos:</p>
                <ul class="effects-list">
                  ${(module.effects || []).map(effect => `
                    <li><i class="fas fa-plus"></i> ${effect}</li>
                  `).join('')}
                </ul>
              </div>

              ${module.requirement ? `
                <div class="module-requirement">
                  <span class="req-icon"><i class="fas fa-lock"></i></span>
                  <span class="req-text">Requer: ${module.requirement}</span>
                </div>
              ` : ''}

              <label class="module-selector">
                <input 
                  type="checkbox" 
                  value="${module.id}" 
                  data-module-checkbox
                  ${isSelected ? 'checked' : ''}
                  ${!canSelect ? 'disabled' : ''}
                  class="module-checkbox"
                />
                <span class="selector-label">
                  ${isSelected ? 'Selecionado' : 'Selecionar'}
                </span>
              </label>
            </article>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
