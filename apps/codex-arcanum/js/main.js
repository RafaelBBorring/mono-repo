// main.js — Controlador principal + localStorage

window.selectedProfile       = 'especialista';
window.selectedDist          = 'balanceada';
window.avatarDataUrl         = '';
window.avatarOriginalDataUrl = '';
window._currentSheetId       = null;  // ID da ficha salva (null = ainda não salva)
window._sheetSaved           = false; // flag de estado de salvamento

let currentUser = null;

// ── Auth guard ────────────────────────────────────────────
async function initAuth() {
  let session = await waitForSession();
  if (!session) session = await getSession();
  if (!session) {
    window.location.href = '/login.html';
    return;
  }
  currentUser = session.user;
  const el = document.getElementById('tb-username');
  if (el) el.textContent = currentUser.user_metadata?.name || currentUser.email.split('@')[0];
}
initAuth();

async function doLogout() {
  await window.supabaseClient.auth.signOut();
  window.location.href = '/login.html';
}

// ── Toast (index.html) ────────────────────────────────────
let _toastTimer;
function showPageToast(msg) {
  const t   = document.getElementById('page-toast');
  const msg_ = document.getElementById('page-toast-msg');
  if (!t) return;
  if (msg_) msg_.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Indicador "não salva" ─────────────────────────────────
function _markUnsaved() {
  window._sheetSaved = false;
  const ind = document.getElementById('unsaved-indicator');
  const btn = document.getElementById('btn-save-sheet');
  if (ind) ind.style.display = 'flex';
  if (btn) btn.disabled = false;
}

function _markSaved() {
  window._sheetSaved = true;
  const ind = document.getElementById('unsaved-indicator');
  const btn = document.getElementById('btn-save-sheet');
  if (ind) ind.style.display = 'none';
  if (btn) btn.disabled = true;
}

// ── Salvar ficha nova (botão explícito) ───────────────────
// Chamado pelo botão "Salvar Ficha" após a geração.
// Lê os dados editados inline da ficha renderizada antes de salvar.
async function saveNewSheet() {
  if (!window._pendingSheetData || !currentUser) return;

  const btn = document.getElementById('btn-save-sheet');
  if (btn) btn.disabled = true;

  const out = document.getElementById('sheet-output');

  // Coleta edições inline feitas pelo usuário antes de salvar
  const data = JSON.parse(JSON.stringify(window._pendingSheetData)); // deep clone

  if (out) {
    // Nome
    const nomeEl = out.querySelector('[data-field="nome"]');
    if (nomeEl) data.nome = nomeEl.textContent.trim();

    // Stats
    ['vida','ca','reac','arm','ba','bd','dano'].forEach(f => {
      const el = out.querySelector(`[data-field="${f}"]`);
      if (el) {
        const v = el.textContent.trim();
        data.stats[f] = isNaN(Number(v)) ? v : Number(v);
      }
    });

    // Atributos
    data.attrs && data.attrs.forEach((_, i) => {
      const el = out.querySelector(`[data-field="attr-${i}"]`);
      if (el) data.attrs[i] = parseInt(el.textContent.trim()) || data.attrs[i];
    });

    // Habilidades
    data.abilities && data.abilities.forEach((ab, idx) => {
      const nameEl = out.querySelector(`[data-field="ab-name-${idx}"]`);
      const descEl = out.querySelector(`[data-field="ab-desc-${idx}"]`);
      if (nameEl) ab.name = nameEl.textContent.trim();
      if (descEl) ab.description = descEl.textContent.trim();
      ab.stats && ab.stats.forEach((_, si) => {
        const stEl = out.querySelector(`[data-field="ab-stat-${idx}-${si}"]`);
        if (stEl) ab.stats[si] = stEl.textContent.trim();
      });
    });
  }

  const entry = {
    user_id:   currentUser.id,
    nome:      data.nome,
    profile:   data.profile,
    nivel:     data.nivel,
    na:        String(data.na),
    avatar:    window.avatarDataUrl || null,
    data:      data,
    updated_at: new Date().toISOString()
  };

  if (window._currentSheetId) {
    entry.id = window._currentSheetId;
  }

  const { data: insertedData, error } = await window.supabaseClient
    .from('sheets')
    .upsert([entry], { onConflict: 'id' })
    .select();

  if (error) {
    console.error("Erro ao salvar ficha:", error);
    showPageToast('Erro ao salvar ficha.');
    if (btn) btn.disabled = false;
    return;
  }

  if (insertedData && insertedData.length > 0) {
    window._currentSheetId = insertedData[0].id;
  }
  
  _markSaved();
  showPageToast(window._currentSheetId ? 'Ficha atualizada!' : 'Ficha salva com sucesso!');
}

// ── Dropzone ──────────────────────────────────────────────
function dzDragOver(e) { e.preventDefault(); document.getElementById('avatarDropzone').classList.add('dragover'); }
function dzDragLeave()  { document.getElementById('avatarDropzone').classList.remove('dragover'); }
function dzDrop(e) {
  e.preventDefault();
  document.getElementById('avatarDropzone').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadAvatarFile(file);
}
function dzClick(e) {
  if (e.target.id === 'dzClearBtn' || e.target.closest('#dzClearBtn')) return;
  document.getElementById('avatarFileInput').click();
}
function dzFileChange(e) { if (e.target.files[0]) loadAvatarFile(e.target.files[0]); }
document.addEventListener('paste', function(e) {
  const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items || [];
  for (const item of items) { if (item.type.startsWith('image/')) { loadAvatarFile(item.getAsFile()); break; } }
});
function loadAvatarFile(file) {
  const reader = new FileReader();
  reader.onload = function(ev) {
    window.avatarDataUrl = window.avatarOriginalDataUrl = ev.target.result;
    window.avatarTransform = { x: 0, y: 0, scale: 1 };
    document.getElementById('avatarPreviewImg').src = ev.target.result;
    document.getElementById('dzEmpty').style.display   = 'none';
    document.getElementById('dzPreview').style.display = 'flex';
  };
  reader.readAsDataURL(file);
}
document.getElementById('dzClearBtn').addEventListener('click', function(e) {
  e.stopPropagation();
  window.avatarDataUrl = window.avatarOriginalDataUrl = '';
  window.avatarTransform = { x: 0, y: 0, scale: 1 };
  document.getElementById('avatarPreviewImg').src  = '';
  document.getElementById('avatarFileInput').value = '';
  document.getElementById('dzEmpty').style.display   = 'flex';
  document.getElementById('dzPreview').style.display = 'none';
});

// ── Perfil / Distribuição ──────────────────────────────────
function setProfile(p) {
  window.selectedProfile = p;
  document.querySelectorAll('.profile-card').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + p).classList.add('active');
}
function setDist(d) {
  window.selectedDist = d;
  document.querySelectorAll('.dist-pill').forEach(b => b.classList.remove('active'));
  document.getElementById('dist-' + d).classList.add('active');
}

// ── Cálculos ───────────────────────────────────────────────
function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function calcCA(ba) { return 10 + (ba - 3); }

function interpolate(profile, level) {
  const keys = Object.keys(profile.levels).map(Number).sort((a,b) => a-b);
  if (level <= keys[0]) return { ...profile.levels[keys[0]] };
  if (level >= keys[keys.length-1]) return { ...profile.levels[keys[keys.length-1]] };
  let lo = keys[0], hi = keys[1];
  for (let i = 0; i < keys.length-1; i++) {
    if (keys[i] <= level && level <= keys[i+1]) { lo = keys[i]; hi = keys[i+1]; break; }
  }
  const t = (level-lo)/(hi-lo), a = profile.levels[lo], b = profile.levels[hi];
  return {
    vida: [Math.round(a.vida[0]+(b.vida[0]-a.vida[0])*t), Math.round(a.vida[1]+(b.vida[1]-a.vida[1])*t)],
    arm:  [Math.round(a.arm[0] +(b.arm[0] -a.arm[0]) *t), Math.round(a.arm[1] +(b.arm[1] -a.arm[1]) *t)],
    dano: a.dano, ba: Math.round(a.ba+(b.ba-a.ba)*t), reac: Math.round(a.reac+(b.reac-a.reac)*t)
  };
}

function applyNA(base, naStr) {
  const m = NA_MODS[naStr];
  const vida = Math.round(rand(base.vida[0], base.vida[1]) * (1 + m.vida/100));
  const arm  = rand(base.arm[0], base.arm[1]) + m.arm;
  const ba   = base.ba + m.ba;
  const bd   = ba - 3;
  const ca   = 10 + bd;
  const reac = Math.max(0, base.reac + m.reac);
  return { vida, arm, ba, bd, ca, reac, dano: base.dano, danoExtra: m.danoBase, tag: m.tag };
}

function getAttrDist(level) {
  const tbl = ATTR_DIST[window.selectedDist] || ATTR_DIST.balanceada;
  const fb  = ATTR_DIST.balanceada;
  const pick = t => {
    if (level <= 7  && t['1-7'])   return t['1-7'];
    if (level <= 14 && t['8-14'])  return t['8-14'];
    if (level <= 22 && t['15-22']) return t['15-22'];
    if (t['23-30'])                return t['23-30'];
    return null;
  };
  return pick(tbl) || pick(fb);
}

// ── Geração ───────────────────────────────────────────────
async function generateSheet() {
  const nivel = parseInt(document.getElementById('nivel').value);
  const naStr = document.getElementById('na').value;
  const nome  = document.getElementById('nome').value.trim() || 'Sem Nome';
  const desc  = document.getElementById('habilDesc').value.trim();
  const errEl = document.getElementById('errorMsg');
  errEl.style.display = 'none';

  document.getElementById('form-section').style.display    = 'none';
  document.getElementById('sheet-container').style.display = 'none';
  document.getElementById('loadingArea').style.display     = 'block';
  document.getElementById('genBtn').disabled               = true;

  // Reset estado de salvamento para nova geração
  window._currentSheetId = null;
  window._sheetSaved     = false;

  try {
    const profile = PROFILES[window.selectedProfile];
    const base    = interpolate(profile, nivel);
    const stats   = applyNA(base, naStr);
    const attrs   = [...getAttrDist(nivel)].sort((a,b)=>b-a).map(v=>v+rand(-1,1));
    const aiData  = await callAI(nivel, naStr, window.selectedProfile, stats, attrs, desc);

    const sheetData = { nivel, na: naStr, nome, profile: window.selectedProfile, stats, attrs, abilities: aiData.abilities };

    // Guarda os dados pendentes — salvamento só ocorre quando o jogador clicar "Salvar Ficha"
    window._pendingSheetData = sheetData;

    renderSheet(sheetData);
    _markUnsaved(); // mostra indicador de não salva

  } catch(e) {
    document.getElementById('form-section').style.display = 'block';
    document.getElementById('genBtn').disabled = false;
    errEl.textContent = `Erro ao gerar ficha: ${e.message || e}`;
    errEl.style.display = 'block';
    console.error('[generateSheet]', e);
  } finally {
    document.getElementById('loadingArea').style.display = 'none';
  }
}

function resetForm() {
  document.getElementById('form-section').style.display    = 'block';
  document.getElementById('sheet-container').style.display = 'none';
  document.getElementById('genBtn').disabled               = false;
  document.getElementById('errorMsg').style.display        = 'none';
  window._currentSheetId   = null;
  window._pendingSheetData = null;
  window._sheetSaved       = false;
  const ind = document.getElementById('unsaved-indicator');
  if (ind) ind.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
