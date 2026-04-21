export function renderPill(text, tone = 'neutral') {
  return `<span class="ui-pill ${tone}">${text}</span>`;
}

export function renderSectionLead(eyebrow, title, description, actions = '') {
  return `
    <header class="section-lead">
      <div>
        <p class="eyebrow">${eyebrow}</p>
        <h2>${title}</h2>
        <p class="section-copy">${description}</p>
      </div>
      ${actions ? `<div class="section-actions">${actions}</div>` : ''}
    </header>
  `;
}

export function renderStatCard(label, value, detail, tone = 'neutral') {
  return `
    <article class="stat-card ${tone}">
      <span class="stat-label">${label}</span>
      <strong>${value}</strong>
      <small>${detail}</small>
    </article>
  `;
}

export function renderTable(section) {
  return `
    <article class="guide-card ${section.tone}">
      <div class="guide-card-head">
        <p class="eyebrow">Referencia viva</p>
        <h3>${section.title}</h3>
      </div>
      <div class="guide-table-wrap">
        <table class="guide-table">
          <thead>
            <tr>${section.columns.map((column) => `<th>${column}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${section.rows
              .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
              .join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

export function renderBackButton(href, label = 'Voltar') {
  return `<a class="back-button" href="${href}"><i class="fas fa-chevron-left"></i> ${label}</a>`;
}

export function renderStepIndicator(currentStep, steps) {
  return `
    <div class="step-indicator">
      ${steps.map((step, i) => `
        <div class="step-dot ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'active' : ''}">
          <div class="step-dot-inner">
            ${i < currentStep ? '<i class="fas fa-check" style="font-size:0.7rem"></i>' : (i + 1)}
          </div>
        </div>
        ${i < steps.length - 1 ? `<div class="step-line ${i < currentStep ? 'done' : ''}"></div>` : ''}
      `).join('')}
    </div>
  `;
}
