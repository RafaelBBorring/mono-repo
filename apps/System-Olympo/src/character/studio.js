import { deriveCharacter, estimateAbilityAverage, estimateAbilityPp } from './calculator.js';
import { buildValidationReport } from './validator.js';
import { attributeLabels, attributeOrder, classProfiles, triageCatalog } from '../data/mock-data.js';
import { renderPill, renderStatCard, renderBackButton } from '../ui/components.js';

const classIcons = {
  guerreiro: 'fa-shield-halved',
  operativo: 'fa-crosshairs',
  mistico: 'fa-hat-wizard'
};

function renderAvatar(character, profile) {
  return `
    <div class="avatar-stage ${profile.aura}" data-avatar-zone>
      ${character.avatar
        ? `<img src="${character.avatar}" alt="${character.name}" />`
        : `<div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem;">
            <i class="fas ${classIcons[character.classId] || 'fa-user'}" style="font-size:2.5rem;color:var(--text-muted);"></i>
            <span style="font-size:1.5rem;font-family:var(--font-display);font-weight:700;">${character.name.slice(0, 2).toUpperCase()}</span>
          </div>`
      }
      <small style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);white-space:nowrap;">Ctrl+V ou arraste imagem</small>
    </div>
  `;
}

function renderAbilityCard(ability, tier, editable, index) {
  const average = estimateAbilityAverage(ability.damage);
  const pp = estimateAbilityPp(ability);
  const budget = tier.pp[ability.type];

  const typeIcons = {
    'Passiva': 'fa-circle-check',
    'Ativa Fraca': 'fa-bolt',
    'Ativa Media': 'fa-bolt-lightning',
    'Ativa Forte': 'fa-explosion',
    'Ultimate': 'fa-star'
  };

  if (!editable) {
    return `
      <article class="ability-display">
        <div class="split-line">
          <strong><i class="fas ${typeIcons[ability.type] || 'fa-circle'}"></i> ${ability.name}</strong>
          ${renderPill(ability.type, ability.type === 'Ultimate' ? 'info' : 'neutral')}
        </div>
        <p>${ability.effect}</p>
        <small>
          ${ability.range} · ${ability.duration} · ${ability.damage || 'Sem dano'}
          ${average > 0 ? ` · Media ${average.toFixed(1)}` : ''}
        </small>
      </article>
    `;
  }

  return `
    <article class="ability-editor">
      <div class="split-line">
        <strong><i class="fas ${typeIcons[ability.type] || 'fa-circle'}"></i> ${ability.type}</strong>
        ${renderPill(`PP ${pp}/${budget}`, pp <= budget ? 'success' : 'warning')}
      </div>
      <div class="field-grid wide">
        <input type="text" value="${ability.name}" data-character-ability="${index}" data-field="name" placeholder="Nome" />
        <input type="number" min="0" value="${ability.cost}" data-character-ability="${index}" data-field="cost" placeholder="Custo" />
      </div>
      <div class="field-grid wide">
        <input type="text" value="${ability.range}" data-character-ability="${index}" data-field="range" placeholder="Alcance" />
        <input type="text" value="${ability.duration}" data-character-ability="${index}" data-field="duration" placeholder="Duracao" />
      </div>
      <input type="text" value="${ability.damage}" data-character-ability="${index}" data-field="damage" placeholder="Dano" />
      <textarea rows="3" data-character-ability="${index}" data-field="effect">${ability.effect}</textarea>
      <small>Dano medio ${average.toFixed(1)}</small>
    </article>
  `;
}

export function renderCharacterStudio({ state, params }, editable) {
  const character = state.characters.find(item => item.id === Number(params.id)) ?? state.characters[0];
  const derived = deriveCharacter(character);
  const profile = classProfiles[character.classId];
  const triage = (triageCatalog[character.classId] ?? []).find(item => item.id === character.triageId);
  const validations = buildValidationReport(character);

  return {
    html: `
      ${renderBackButton('#/dashboard', 'Voltar a Biblioteca')}
      ${renderSectionLead(
        editable ? 'Studio de Edicao' : 'Ficha do Personagem',
        editable ? 'Refine cada aspecto da ficha' : character.name,
        editable
          ? 'Altere qualquer campo. Avatar aceita colar ou arrastar.'
          : `${profile.name} · ${triage?.name ?? 'Sem triagem'} · Nivel ${character.level}`,
        editable
          ? `<button class="primary-button" data-save-placeholder><i class="fas fa-floppy-disk"></i> Salvar</button>`
          : `<a class="ghost-button inline-link" href="#/character/${character.id}/edit"><i class="fas fa-pen"></i> Editar</a>`
      )}
      <section class="studio-grid">
        <article class="panel-shell studio-side">
          ${renderAvatar(character, profile)}
          <div class="identity-block">
            ${editable
              ? `
                <div class="form-group">
                  <label><i class="fas fa-user"></i> Nome</label>
                  <input type="text" value="${character.name}" data-character-field="name" />
                </div>
                <div class="form-group">
                  <label><i class="fas fa-users"></i> Jogador</label>
                  <input type="text" value="${character.player}" data-character-field="player" />
                </div>
                <div class="form-group">
                  <label><i class="fas fa-scroll"></i> Notas</label>
                  <textarea rows="3" data-character-field="notes">${character.notes}</textarea>
                </div>
              `
              : `
                <h3>${character.name}</h3>
                <p style="color:var(--text-muted)">${character.player}</p>
                <p class="muted">${character.notes}</p>
              `
            }
            ${renderPill(`<i class="fas ${classIcons[character.classId]}"></i> ${profile.name} · ${triage?.name ?? 'Sem triagem'} · Nivel ${character.level}`, 'info')}
          </div>

          <div style="margin-top:1rem;">
            <p class="eyebrow"><i class="fas fa-chart-bar"></i> Atributos</p>
          </div>
          <div class="attribute-grid compact">
            ${attributeOrder.map(key => `
              <div class="attribute-chip">
                <span>${attributeLabels[key]}</span>
                ${editable
                  ? `<input type="number" value="${derived.attributes[key].total}" data-character-attribute="${key}" style="text-align:center;font-size:1.1rem;font-weight:700;padding:0.4rem;" />`
                  : `<strong>${derived.attributes[key].total}</strong>`
                }
                <small>Mod ${derived.attributes[key].modifier >= 0 ? '+' : ''}${derived.attributes[key].modifier}</small>
              </div>
            `).join('')}
          </div>

          <div style="margin-top:1rem;">
            <p class="eyebrow"><i class="fas fa-list"></i> Pericias</p>
            <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">
              ${character.trainedSkills.map(skill => `
                <span style="font-size:0.75rem;padding:0.3rem 0.6rem;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:var(--text-secondary);">${skill}</span>
              `).join('')}
            </div>
          </div>
        </article>

        <article class="panel-shell studio-main">
          <div class="studio-section">
            <p class="eyebrow"><i class="fas fa-heart-pulse"></i> Estatisticas de Combate</p>
            <div class="stat-grid">
              ${renderStatCard('HP Total', derived.totalHp, `Base ${derived.baseHp} · /nivel ${derived.hpPerLevel}`, 'danger')}
              ${renderStatCard('Energia', derived.energyTotal, `${derived.tier.label}`, 'info')}
              ${renderStatCard('PE', derived.peTotal, `CA ${derived.ca}`, 'neutral')}
              ${renderStatCard('Reacoes', derived.reactions, derived.damageBase, 'neutral')}
            </div>
          </div>

          <div class="studio-section">
            <div class="split-line">
              <div>
                <p class="eyebrow"><i class="fas fa-wand-sparkles"></i> Habilidades</p>
                <h3>${editable ? 'Edicao das Tecnicas' : 'Tecnicas do Personagem'}</h3>
              </div>
              ${renderPill(character.saveStatus, character.saveStatus === 'Aprovado' ? 'success' : 'warning')}
            </div>
            <div class="ability-stack">
              ${character.abilities.map((ability, index) => renderAbilityCard(ability, derived.tier, editable, index)).join('')}
            </div>
          </div>

          <div class="studio-section">
            <p class="eyebrow"><i class="fas fa-shield-check"></i> Validacoes do Sistema</p>
            <div class="validation-stack">
              ${validations.map(item => `
                <article class="validation-card ${item.state}">
                  <div class="split-line">
                    <strong>${item.code}</strong>
                    ${renderPill(item.title, item.state === 'ok' ? 'success' : item.state === 'warn' ? 'warning' : 'danger')}
                  </div>
                  <p>${item.detail}</p>
                  <small>${item.hint}</small>
                </article>
              `).join('')}
            </div>
          </div>

          ${character.moduleIds.length > 0 ? `
            <div class="studio-section">
              <p class="eyebrow"><i class="fas fa-puzzle-piece"></i> Modulos Ativos</p>
              <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                ${character.moduleIds.map(id => {
                  const mod = id;
                  return `<span style="font-size:0.82rem;padding:0.4rem 0.8rem;border-radius:10px;background:rgba(178,140,255,0.08);border:1px solid rgba(178,140,255,0.15);color:var(--accent-arcane);">${id.replace(/_/g, ' ')}</span>`;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </article>
      </section>
    `,
    bind(root, { actions, rerender }) {
      const zone = root.querySelector('[data-avatar-zone]');
      if (zone && editable) {
        zone.addEventListener('dragover', event => {
          event.preventDefault();
          zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', event => {
          event.preventDefault();
          zone.classList.remove('drag-over');
          const file = event.dataTransfer?.files?.[0];
          if (file) actions.readAvatar(file, character.id);
        });
        window.addEventListener('paste', event => {
          const file = Array.from(event.clipboardData?.items ?? [])
            .find(item => item.type.startsWith('image/'))
            ?.getAsFile();
          if (file) actions.readAvatar(file, character.id);
        }, { once: true });
      }

      if (!editable) return;

      root.querySelectorAll('[data-character-field]').forEach(field => {
        field.addEventListener('input', () => {
          actions.updateCharacter(character.id, draft => {
            draft[field.dataset.characterField] = field.value;
          });
        });
      });

      root.querySelectorAll('[data-character-attribute]').forEach(input => {
        input.addEventListener('input', () => {
          actions.updateCharacter(character.id, draft => {
            const nextValue = Math.max(3, Number(input.value) || 3);
            const currentBase = draft.arrayAssignments[input.dataset.characterAttribute];
            draft.bonusAssignments[input.dataset.characterAttribute] = Math.max(0, nextValue - currentBase);
          });
          rerender();
        });
      });

      root.querySelectorAll('[data-character-ability]').forEach(field => {
        field.addEventListener('input', () => {
          const index = Number(field.dataset.characterAbility);
          const key = field.dataset.field;
          actions.updateCharacter(character.id, draft => {
            draft.abilities[index][key] = field.type === 'number' ? Number(field.value) || 0 : field.value;
          });
          rerender();
        });
      });

      root.querySelector('[data-save-placeholder]')?.addEventListener('click', () => {
        actions.savePlaceholder(character.id);
      });
    }
  };
}
