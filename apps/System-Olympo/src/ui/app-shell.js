import { resolveRoute } from '../app.js';
import { createDraftCharacter, sampleCharacters } from '../data/mock-data.js';

function getCurrentPath() {
  return window.location.hash.replace('#', '') || '/';
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function renderTopbar(activePath) {
  const items = [
    ['/dashboard', 'Fichas', 'fa-dungeon'],
    ['/character/new', 'Nova ficha', 'fa-hammer'],
    ['/system', 'Sistema', 'fa-book']
  ];

  return `
    <header class="topbar panel-shell">
      <a class="brand-mark" href="#/dashboard">
        <span class="brand-rune"></span>
        <div>
          <strong>Sistema Olympo</strong>
          <small>Portal de fichas</small>
        </div>
      </a>
      <nav class="topbar-nav">
        ${items.map(([path, label, icon]) => `
          <a class="topbar-link ${activePath === path ? 'active' : ''}" href="#${path}">
            <i class="fas ${icon}"></i> ${label}
          </a>
        `).join('')}
      </nav>
    </header>
  `;
}

export function createApp(root) {
  const state = {
    isAuthenticated: false,
    characters: clone(sampleCharacters),
    draft: createDraftCharacter(),
    notice: ''
  };

  function navigate(path) {
    window.location.hash = path;
  }

  function flash(message) {
    state.notice = message;
    render();
    window.clearTimeout(flash.timer);
    flash.timer = window.setTimeout(() => {
      state.notice = '';
      render();
    }, 2500);
  }

  const actions = {
    login() {
      state.isAuthenticated = true;
      navigate('/dashboard');
    },
    logout() {
      state.isAuthenticated = false;
      navigate('/');
    },
    flash,
    updateDraft(mutator) {
      mutator(state.draft);
    },
    commitDraft() {
      const nextId = Math.max(...state.characters.map(c => c.id), 0) + 1;
      const created = clone(state.draft);
      created.id = nextId;
      created.saveStatus = 'Rascunho local';
      state.characters.unshift(created);
      state.draft = createDraftCharacter();
      flash('Personagem forjado com sucesso!');
      navigate(`/character/${nextId}/edit`);
    },
    updateCharacter(id, mutator) {
      const target = state.characters.find(c => c.id === id);
      if (!target) return;
      mutator(target);
    },
    async readAvatar(file, characterId) {
      const target = state.characters.find(c => c.id === characterId);
      if (!target) return;
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      target.avatar = dataUrl;
      flash('Avatar aplicado!');
      render();
    },
    savePlaceholder(id) {
      const target = state.characters.find(c => c.id === id);
      if (!target) return;
      target.saveStatus = 'Pronto para banco';
      flash('Salvo como referencia.');
      render();
    }
  };

  function render() {
    const rawPath = getCurrentPath();
    if (!state.isAuthenticated && rawPath !== '/') {
      window.location.hash = '/';
      return;
    }

    if (state.isAuthenticated && rawPath === '/') {
      window.location.hash = '/dashboard';
      return;
    }

    const route = resolveRoute(state.isAuthenticated ? rawPath : '/');
    const screen = route.render({ state, params: route.params, actions });

    root.innerHTML = `
      <div class="app-shell ${route.path === '/' ? 'auth-mode' : ''}">
        <div class="scene-backdrop">
          <div class="mist-layer mist-a"></div>
          <div class="mist-layer mist-b"></div>
          <div class="grid-halo"></div>
        </div>
        ${state.isAuthenticated ? renderTopbar(route.path) : ''}
        ${state.notice ? `<aside class="notice-banner"><i class="fas fa-sparkles"></i> ${state.notice}</aside>` : ''}
        <main class="page-shell">${screen.html}</main>
      </div>
    `;

    screen.bind?.(root.querySelector('.page-shell'), {
      state,
      actions,
      navigate,
      rerender: render
    });
  }

  window.addEventListener('hashchange', render);
  render();
}
