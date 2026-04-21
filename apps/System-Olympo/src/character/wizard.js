import {
  attributeLabels,
  attributeLore,
  attributeOrder,
  classProfiles,
  evolutionMilestones,
  moduleCatalog,
  skillCatalog,
  triageCatalog
} from '../data/mock-data.js';
import {
  deriveCharacter,
  estimateAbilityAverage,
  estimateAbilityPp,
  getAvailableSkeletonPoints
} from './calculator.js';
import { buildValidationReport } from './validator.js';
import { renderPill, renderStatCard, renderBackButton, renderStepIndicator } from '../ui/components.js';
import { goldenBurst, classBurst } from '../ui/particles.js';
import {
  renderClassStep,
  renderAttributesStep,
  renderTriagesPanel,
  renderSkillsPanel,
  renderLevelPanel,
  renderModulesPanel
} from './wizard-components.js';
import { createLiveStatsPanel, updateLiveStats } from './wizard-feedback.js';

const STEPS = [
  { id: 'identity', title: 'Identidade', icon: 'fa-user' },
  { id: 'class', title: 'Classe', icon: 'fa-shield-halved' },
  { id: 'attributes', title: 'Atributos', icon: 'fa-dice-d20' },
  { id: 'skills', title: 'Pericias & Modulos', icon: 'fa-list-check' },
  { id: 'review', title: 'Forjar', icon: 'fa-hammer' }
];

let currentStep = 0;

const classIcons = {
  guerreiro: 'fa-shield-halved',
  operativo: 'fa-crosshairs',
  mistico: 'fa-hat-wizard'
};

function renderStep0Identity(draft) {
  return `
    <div class="identity-epic">
      <div class="identity-icon"><i class="fas fa-feather-pointed"></i></div>
      <h2>Quem entra na arena?</h2>
      <p>Toda lenda comeca com um nome. Defina a identidade do seu heroi antes de forjar seu destino.</p>
    </div>
    <article class="wizard-card panel-shell">
      <div class="field-grid wide">
        <div class="form-group">
          <label><i class="fas fa-user"></i> Nome do Personagem</label>
          <input type="text" value="${draft.name}" data-draft-field="name" placeholder="Nome do heroi" />
        </div>
        <div class="form-group">
          <label><i class="fas fa-users"></i> Jogador</label>
          <input type="text" value="${draft.player}" data-draft-field="player" placeholder="Seu nome" />
        </div>
      </div>
      <div class="form-group" style="margin-top:1rem;">
        <label><i class="fas fa-scroll"></i> Notas</label>
        <textarea rows="3" data-draft-field="notes" placeholder="Background, conceito ou anotacoes...">${draft.notes}</textarea>
      </div>
    </article>
  `;
}

function renderStep1Class(draft) {
  return renderClassStep(draft, classProfiles);
}

function renderStep2Attributes(draft, derived) {
  return `
    ${renderAttributesStep(draft, derived, getAvailableSkeletonPoints)}
    <div id="live-stats-feedback">
      ${createLiveStatsPanel(draft)}
    </div>
  `;
}

function renderStep3Skills(draft, derived) {
  return `
    <div class="wizard-header">
      <div>
        <p class="eyebrow"><i class="fas fa-list-check"></i> Refinando a Build</p>
        <h2 class="wizard-title">Especialização do Personagem</h2>
        <p class="wizard-subtitle">Configure triagens, perícias, módulos e nível que definem seu estilo de combate.</p>
      </div>
    </div>

    ${renderTriagesPanel(draft, triageCatalog, classProfiles)}
    ${renderSkillsPanel(draft, derived, skillCatalog, attributeOrder)}
    ${renderLevelPanel(draft)}
    ${renderModulesPanel(draft, derived, moduleCatalog)}

    ${evolutionMilestones.filter(m => draft.level >= m.level).length > 0 ? `
      <article class="wizard-card panel-shell" style="margin-top:1rem;">
        <div class="split-line">
          <div>
            <p class="eyebrow"><i class="fas fa-trophy"></i> Marcos de Evolucao</p>
            <h3>Escolhas desbloqueadas</h3>
          </div>
        </div>
        <div class="milestone-grid">
          ${evolutionMilestones
            .filter(m => draft.level >= m.level)
            .map(milestone => `
              <article class="milestone-card compact">
                <div class="split-line">
                  <div>
                    <p class="eyebrow">Nivel ${milestone.level}</p>
                    <h4>${milestone.title}</h4>
                  </div>
                  ${renderPill(milestone.summary, 'info')}
                </div>
                <div class="choice-grid">
                  ${milestone.rewards.map(reward => `
                    <label class="choice-card selectable ${draft.evolutionChoices[milestone.id] === reward.id ? 'selected' : ''}">
                      <input type="radio" name="${milestone.id}" value="${reward.id}" data-milestone="${milestone.id}" ${draft.evolutionChoices[milestone.id] === reward.id ? 'checked' : ''} />
                      <strong>${reward.title}</strong>
                      <p>${reward.description}</p>
                    </label>
                  `).join('')}
                </div>
              </article>
            `).join('')}
        </div>
      </article>
    ` : ''}

    <article class="wizard-card panel-shell" style="margin-top:1rem;">
      <div class="split-line">
        <div>
          <p class="eyebrow"><i class="fas fa-wand-sparkles"></i> Habilidades</p>
          <h3>Slots da ficha</h3>
        </div>
      </div>
      <div class="ability-stack">
        ${draft.abilities.map((ability, index) => {
          const average = estimateAbilityAverage(ability.damage);
          const pp = estimateAbilityPp(ability);
          const budget = derived.tier.pp[ability.type];

          return `
            <div class="ability-editor">
              <div class="split-line">
                <strong><i class="fas fa-bolt"></i> ${ability.type}</strong>
                ${renderPill(`PP ${pp}/${budget}`, pp <= budget ? 'success' : 'warning')}
              </div>
              <div class="field-grid wide">
                <input type="text" value="${ability.name}" data-ability="${index}" data-field="name" placeholder="Nome da habilidade" />
                <input type="number" min="0" value="${ability.cost}" data-ability="${index}" data-field="cost" placeholder="Custo" />
              </div>
              <div class="field-grid wide">
                <input type="text" value="${ability.duration}" data-ability="${index}" data-field="duration" placeholder="Duracao" />
                <input type="text" value="${ability.range}" data-ability="${index}" data-field="range" placeholder="Alcance" />
              </div>
              <input type="text" value="${ability.damage}" data-ability="${index}" data-field="damage" placeholder="Dano (ex: 4d10+18)" />
              <textarea rows="2" data-ability="${index}" data-field="effect" placeholder="Descricao do efeito...">${ability.effect}</textarea>
              <small>Dano medio ${average.toFixed(1)} · Teto ${ability.type === 'Passiva' ? '-' : derived.tier.tdh[ability.type]}</small>
            </div>
          `;
        }).join('')}
      </div>
    </article>
  `;
}

function renderStep4Review(draft, derived) {
  const validations = buildValidationReport(draft);
  const profile = classProfiles[draft.classId];
  const triage = (triageCatalog[draft.classId] ?? []).find(t => t.id === draft.triageId);

  return `
    <div class="class-epic-title">
      <p class="eyebrow"><i class="fas fa-hammer"></i> Revisao Final</p>
      <h2>Pronto para Forjar</h2>
      <p>Revise os dados antes de dar vida ao seu personagem.</p>
    </div>

    <article class="wizard-card panel-shell">
      <div class="split-line">
        <div>
          <h3>${draft.name}</h3>
          <p class="muted">${profile.name} · ${triage?.name ?? 'Sem triagem'} · Nivel ${draft.level}</p>
        </div>
        ${renderPill('Rascunho', 'warning')}
      </div>
      <div class="stat-grid">
        ${renderStatCard('HP total', derived.totalHp, `Base ${derived.baseHp} · /nivel ${derived.hpPerLevel}`, 'danger')}
        ${renderStatCard('Energia', derived.energyTotal, `Tier ${derived.tier.label}`, 'info')}
        ${renderStatCard('PE', derived.peTotal, `CA ${derived.ca}`, 'neutral')}
        ${renderStatCard('Reacoes', derived.reactions, derived.damageBase, 'neutral')}
      </div>
    </article>

    <article class="wizard-card panel-shell">
      <p class="eyebrow"><i class="fas fa-check-double"></i> Validacoes do Sistema</p>
      <div class="validation-stack">
        ${validations.map(item => `
          <article class="validation-card ${item.state}">
            <div class="split-line">
              <strong>${item.code} · ${item.title}</strong>
              ${renderPill(item.state === 'ok' ? 'OK' : item.state === 'warn' ? 'Aviso' : 'Erro', item.state === 'ok' ? 'success' : item.state === 'warn' ? 'warning' : 'danger')}
            </div>
            <p>${item.detail}</p>
            <small>${item.hint}</small>
          </article>
        `).join('')}
      </div>
    </article>

    <article class="wizard-card panel-shell">
      <div class="cta-row" style="justify-content:center; gap:1rem;">
        <button class="ghost-button" data-draft-avatar-trigger>
          <i class="fas fa-image"></i> Adicionar Avatar
        </button>
        <button class="primary-button" data-forge-character style="font-size:1.1rem; padding:1rem 2rem;">
          <i class="fas fa-hammer"></i> Forjar Personagem
        </button>
      </div>
    </article>
  `;
}

export function renderWizard({ state }) {
  const draft = state.draft;
  const derived = deriveCharacter(draft);

  const stepRenderers = [
    () => renderStep0Identity(draft),
    () => renderStep1Class(draft),
    () => renderStep2Attributes(draft, derived),
    () => renderStep3Skills(draft, derived),
    () => renderStep4Review(draft, derived)
  ];

  return {
    html: `
      ${renderBackButton('#/dashboard', 'Voltar ao Hall')}
      ${renderStepIndicator(currentStep, STEPS)}
      ${stepRenderers.map((renderer, i) => `
        <div class="wizard-step ${i === currentStep ? 'active' : ''}" data-step="${i}">
          ${renderer()}
        </div>
      `).join('')}
      <div class="wizard-nav">
        ${currentStep > 0
          ? `<button class="ghost-button" data-wizard-back><i class="fas fa-chevron-left"></i> Voltar</button>`
          : '<span></span>'
        }
        ${currentStep < STEPS.length - 1
          ? `<button class="primary-button" data-wizard-next>Proximo <i class="fas fa-chevron-right"></i></button>`
          : ''
        }
      </div>
    `,
    bind(root, { actions, rerender }) {
      root.querySelector('[data-wizard-next]')?.addEventListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();
        goldenBurst(rect.left + rect.width / 2, rect.top);
        if (currentStep < STEPS.length - 1) {
          currentStep++;
          rerender();
        }
      });

      root.querySelector('[data-wizard-back]')?.addEventListener('click', () => {
        if (currentStep > 0) {
          currentStep--;
          rerender();
        }
      });

      root.querySelectorAll('[data-draft-field]').forEach(field => {
        field.addEventListener('input', () => {
          const key = field.dataset.draftField;
          const value = field.type === 'number' ? Number(field.value) : field.value;
          actions.updateDraft(draft => {
            draft[key] = key === 'level' ? Math.min(30, Math.max(1, Number(value) || 1)) : value;
            const triages = triageCatalog[draft.classId] ?? [];
            if (!triages.some(t => t.id === draft.triageId)) {
              draft.triageId = triages[0]?.id ?? '';
            }
          });
          rerender();
        });
      });

      root.querySelectorAll('[data-class]').forEach(button => {
        button.addEventListener('click', (e) => {
          const rect = button.getBoundingClientRect();
          const profile = classProfiles[button.dataset.class];
          const colorMap = { guerreiro: '#f0c56d', operativo: '#64c8ff', mistico: '#b28cff' };
          classBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, colorMap[button.dataset.class] || '#f0c56d');
          actions.updateDraft(draft => {
            draft.classId = button.dataset.class;
            draft.triageId = (triageCatalog[draft.classId] ?? [])[0]?.id ?? '';
          });
          rerender();
        });
      });

      root.querySelectorAll('[data-array-attribute]').forEach(select => {
        select.addEventListener('change', () => {
          const rect = select.closest('.attribute-editor')?.getBoundingClientRect();
          if (rect) goldenBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 30);

          actions.updateDraft(draft => {
            const key = select.dataset.arrayAttribute;
            const previous = draft.arrayAssignments[key];
            const nextValue = Number(select.value);
            const duplicateKey = attributeOrder.find(attr => attr !== key && draft.arrayAssignments[attr] === nextValue);
            draft.arrayAssignments[key] = nextValue;
            if (duplicateKey) draft.arrayAssignments[duplicateKey] = previous;
          });
          rerender();
        });
      });

      root.querySelectorAll('[data-bonus-attribute]').forEach(input => {
        input.addEventListener('input', () => {
          actions.updateDraft(draft => {
            draft.bonusAssignments[input.dataset.bonusAttribute] = Math.max(0, Number(input.value) || 0);
            const available = getAvailableSkeletonPoints(draft);
            const spent = attributeOrder.reduce((sum, key) => sum + Number(draft.bonusAssignments[key] ?? 0), 0);
            if (spent > available) {
              draft.bonusAssignments[input.dataset.bonusAttribute] = Math.max(
                0,
                Number(draft.bonusAssignments[input.dataset.bonusAttribute]) - (spent - available)
              );
            }
          });
          rerender();
          // Atualizar painel de feedback em tempo real
          setTimeout(() => {
            const feedbackRoot = root.querySelector('#live-stats-feedback');
            if (feedbackRoot) {
              const currentDraft = state.draft;
              updateLiveStats(feedbackRoot.querySelector('.live-stats-panel'), currentDraft);
            }
          }, 0);
        });
      });

      root.querySelectorAll('[data-milestone]').forEach(input => {
        input.addEventListener('change', () => {
          actions.updateDraft(draft => {
            draft.evolutionChoices[input.dataset.milestone] = input.value;
          });
          rerender();
        });
      });

      // --- NEW: Triages Panel ---
      root.querySelectorAll('[data-triageId]').forEach(button => {
        button.addEventListener('click', () => {
          actions.updateDraft(draft => {
            draft.triageId = button.dataset.triageId;
          });
          rerender();
        });
      });

      // --- NEW: Skills Checkboxes ---
      root.querySelectorAll('[data-skill-checkbox]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          actions.updateDraft(draft => {
            if (checkbox.checked) {
              if (!draft.trainedSkills.includes(checkbox.value)) {
                draft.trainedSkills.push(checkbox.value);
              }
            } else {
              draft.trainedSkills = draft.trainedSkills.filter(s => s !== checkbox.value);
            }
          });
          rerender();
        });
      });

      // --- NEW: Level Input/Slider ---
      const levelInput = root.querySelector('[data-level-input]');
      const levelSlider = root.querySelector('[data-level-slider]');
      
      if (levelInput) {
        levelInput.addEventListener('input', () => {
          const value = Math.max(1, Math.min(30, Number(levelInput.value) || 1));
          actions.updateDraft(draft => {
            draft.level = value;
          });
          if (levelSlider) levelSlider.value = value;
          rerender();
          // Atualizar painel de feedback
          setTimeout(() => {
            const feedbackRoot = root.querySelector('#live-stats-feedback');
            if (feedbackRoot) {
              updateLiveStats(feedbackRoot.querySelector('.live-stats-panel'), state.draft);
            }
          }, 0);
        });
      }

      if (levelSlider) {
        levelSlider.addEventListener('input', () => {
          const value = Number(levelSlider.value);
          actions.updateDraft(draft => {
            draft.level = value;
          });
          if (levelInput) levelInput.value = value;
          rerender();
          // Atualizar painel de feedback
          setTimeout(() => {
            const feedbackRoot = root.querySelector('#live-stats-feedback');
            if (feedbackRoot) {
              updateLiveStats(feedbackRoot.querySelector('.live-stats-panel'), state.draft);
            }
          }, 0);
        });
      }

      // --- NEW: Modules Checkboxes ---
      root.querySelectorAll('[data-module-checkbox]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          actions.updateDraft(draft => {
            if (checkbox.checked) {
              if (!draft.moduleIds.includes(checkbox.value)) {
                draft.moduleIds.push(checkbox.value);
              }
            } else {
              draft.moduleIds = draft.moduleIds.filter(m => m !== checkbox.value);
            }
          });
          rerender();
        });
      });

      const skillSelect = root.querySelector('[data-skill-select]');
      skillSelect?.addEventListener('change', () => {
        actions.updateDraft(draft => {
          draft.trainedSkills = Array.from(skillSelect.selectedOptions).map(o => o.value);
        });
        rerender();
      });

      const moduleSelect = root.querySelector('[data-module-select]');
      moduleSelect?.addEventListener('change', () => {
        actions.updateDraft(draft => {
          draft.moduleIds = Array.from(moduleSelect.selectedOptions).map(o => o.value);
        });
        rerender();
      });

      root.querySelectorAll('[data-ability]').forEach(field => {
        field.addEventListener('input', () => {
          const index = Number(field.dataset.ability);
          const key = field.dataset.field;
          actions.updateDraft(draft => {
            draft.abilities[index][key] = field.type === 'number' ? Number(field.value) || 0 : field.value;
          });
          rerender();
        });
      });

      root.querySelector('[data-forge-character]')?.addEventListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();
        goldenBurst(rect.left + rect.width / 2, rect.top, 120);
        setTimeout(() => {
          currentStep = 0;
          actions.commitDraft();
        }, 400);
      });

      root.querySelector('[data-draft-avatar-trigger]')?.addEventListener('click', () => {
        actions.flash('Cole uma imagem com Ctrl+V ou arraste sobre o avatar no editor.');
      });
    }
  };
}
