import { dissolve, assemble } from '../ui/particles.js';

let authMode = 'login';

export function renderAuthScreen({ state }) {
  const sampleName = state.characters[0]?.name ?? 'Asterion';

  return {
    html: `
      <section class="auth-screen">
        <div class="auth-container" id="auth-card">
          <div class="auth-brand">
            <div class="auth-brand-icon">
              <i class="fas fa-sun"></i>
            </div>
            <h1>Sistema Olympo</h1>
            <p>Entre no templo e forje seus herois</p>
          </div>

          <div class="auth-tabs">
            <button class="auth-tab ${authMode === 'login' ? 'active' : ''}" data-auth-tab="login">Login</button>
            <button class="auth-tab ${authMode === 'register' ? 'active' : ''}" data-auth-tab="register">Cadastre-se</button>
          </div>

          <div class="auth-forms">
            <form class="auth-form ${authMode === 'login' ? 'active' : ''}" id="login-form" autocomplete="off">
              <div class="form-group">
                <label><i class="fas fa-envelope"></i> Email</label>
                <input type="email" placeholder="seu@email.com" />
              </div>
              <div class="form-group">
                <label><i class="fas fa-lock"></i> Senha</label>
                <input type="password" placeholder="Sua senha secreta" />
              </div>
              <button class="primary-button btn-block" data-login="email">
                <i class="fas fa-right-to-bracket"></i> Entrar
              </button>
            </form>

            <form class="auth-form ${authMode === 'register' ? 'active' : ''}" id="register-form" autocomplete="off">
              <div class="form-group">
                <label><i class="fas fa-user"></i> Nome do Aventureiro</label>
                <input type="text" placeholder="Como deseja ser conhecido?" />
              </div>
              <div class="form-group">
                <label><i class="fas fa-envelope"></i> Email</label>
                <input type="email" placeholder="seu@email.com" />
              </div>
              <div class="form-group">
                <label><i class="fas fa-lock"></i> Senha</label>
                <input type="password" placeholder="Crie uma senha forte" />
              </div>
              <div class="form-group">
                <label><i class="fas fa-shield-halved"></i> Confirmar Senha</label>
                <input type="password" placeholder="Confirme sua senha" />
              </div>
              <button class="primary-button btn-block" data-login="register">
                <i class="fas fa-wand-sparkles"></i> Criar Conta
              </button>
            </form>
          </div>

          <div class="auth-divider-line"><span>ou</span></div>

          <div class="auth-social">
            <button class="btn-social btn-google" data-login="google">
              <i class="fab fa-google"></i> Google
            </button>
            <button class="btn-social btn-discord" data-login="discord">
              <i class="fab fa-discord"></i> Discord
            </button>
          </div>
        </div>
      </section>
    `,
    bind(root, { actions }) {
      const tabs = root.querySelectorAll('[data-auth-tab]');
      const forms = root.querySelectorAll('.auth-form');

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const target = tab.dataset.authTab;
          if (target === authMode) return;

          const card = root.querySelector('#auth-card');
          const currentForm = root.querySelector('.auth-form.active');
          const targetForm = root.querySelector(`#${target}-form`);

          // Dissolve the ENTIRE card (not just the form fields)
          dissolve(card, () => {
            // DOM swap while card is invisible — user sees nothing jank
            authMode = target;
            currentForm.classList.remove('active');
            currentForm.style.opacity = '';
            currentForm.style.filter = '';
            targetForm.classList.add('active');
            tabs.forEach(t => t.classList.toggle('active', t.dataset.authTab === target));

            // Remove dissolve styles from card, fade it back in as particles converge
            card.style.filter = '';
            card.style.transition = 'opacity 0.55s ease-in';
            requestAnimationFrame(() => {
              card.style.opacity = '';
              setTimeout(() => { card.style.transition = ''; }, 550);
            });

            // Assemble particles converging onto the whole card
            requestAnimationFrame(() => {
              const cardRect = card.getBoundingClientRect();
              assemble(cardRect);
            });
          });
        });
      });

      root.querySelectorAll('[data-login]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          actions.login();
        });
      });
    }
  };
}
