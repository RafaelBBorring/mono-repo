// ============================================================
// db.js — Camada de abstração de dados do Codex Arcanum
//
// Gerencia dois modos de armazenamento:
//   'supabase' → Banco remoto via Supabase (requer internet + auth)
//   'local'    → Arquivo data/local_db.json via Flask (offline)
//
// Todos os arquivos do projeto chamam DB.* em vez de chamar
// supabaseClient diretamente. Para trocar o modo basta
// chamar DB.setMode('local') ou DB.setMode('supabase').
// ============================================================

const DB = (() => {
  // ── Persistência do modo escolhido ──────────────────────
  const MODE_KEY = 'codex_storage_mode';

  let _mode = localStorage.getItem(MODE_KEY) || 'local';

  // Usuário em memória (preenchido pelo initAuth de cada página)
  let _currentUser = null;

  // ── Getters públicos ────────────────────────────────────
  function getMode()        { return _mode; }
  function isLocal()        { return _mode === 'local'; }
  function isSupabase()     { return _mode === 'supabase'; }
  function getCurrentUser() { return _currentUser; }

  // ── Troca de modo ───────────────────────────────────────
  function setMode(mode) {
    if (mode !== 'supabase' && mode !== 'local') return;
    _mode = mode;
    localStorage.setItem(MODE_KEY, mode);
  }

  // ── Auth ────────────────────────────────────────────────
  // Em modo local: lê usuário do servidor Flask (data/local_db.json)
  // Em modo supabase: usa o Supabase Auth normal
  async function initAuth() {
    if (_mode === 'local') {
      try {
        const resp = await fetch('/local/user');
        const u    = await resp.json();
        _currentUser = {
          id:             u.id,
          email:          u.email,
          user_metadata:  { name: u.name, full_name: u.name }
        };
        return _currentUser;
      } catch (e) {
        console.error('[DB.initAuth local]', e);
        return null;
      }
    } else {
      // Supabase: usa waitForSession definido em supabase.js
      try {
        const session = await waitForSession();
        if (!session) return null;
        _currentUser = session.user;
        return _currentUser;
      } catch (e) {
        console.error('[DB.initAuth supabase]', e);
        return null;
      }
    }
  }

  async function signOut() {
    if (_mode === 'supabase') {
      await window.supabaseClient.auth.signOut();
    }
    // Em modo local não há sessão para destruir — só redireciona
    window.location.href = '/login.html';
  }

  // ── FICHAS ──────────────────────────────────────────────

  async function getSheets() {
    if (!_currentUser) return [];

    if (_mode === 'local') {
      try {
        const resp = await fetch('/local/sheets');
        return await resp.json();
      } catch (e) {
        console.error('[DB.getSheets local]', e);
        return [];
      }
    } else {
      const { data, error } = await window.supabaseClient
        .from('sheets')
        .select('*')
        .eq('user_id', _currentUser.id)
        .order('updated_at', { ascending: false });
      if (error) { console.error('[DB.getSheets supabase]', error); return []; }
      return data || [];
    }
  }

  // Insere um array de fichas
  async function insertSheets(sheets) {
    if (_mode === 'local') {
      try {
        const resp = await fetch('/local/sheets', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(sheets)
        });
        if (!resp.ok) throw new Error(await resp.text());
        return { error: null };
      } catch (e) {
        console.error('[DB.insertSheets local]', e);
        return { error: e };
      }
    } else {
      const { error } = await window.supabaseClient.from('sheets').insert(sheets);
      return { error };
    }
  }

  // Atualiza uma ficha (campos parciais OK)
  async function updateSheet(id, fields) {
    if (_mode === 'local') {
      try {
        const resp = await fetch(`/local/sheets/${id}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(fields)
        });
        if (!resp.ok) throw new Error(await resp.text());
        return { error: null };
      } catch (e) {
        console.error('[DB.updateSheet local]', e);
        return { error: e };
      }
    } else {
      const { error } = await window.supabaseClient
        .from('sheets')
        .update(fields)
        .eq('id', id);
      return { error };
    }
  }

  // Apaga uma ficha
  async function deleteSheet(id) {
    if (_mode === 'local') {
      try {
        const resp = await fetch(`/local/sheets/${id}`, { method: 'DELETE' });
        if (!resp.ok) throw new Error(await resp.text());
        return { error: null };
      } catch (e) {
        console.error('[DB.deleteSheet local]', e);
        return { error: e };
      }
    } else {
      const { error } = await window.supabaseClient
        .from('sheets')
        .delete()
        .eq('id', id);
      return { error };
    }
  }

  async function deleteSheetsBatch(ids) {
    if (_mode === 'local') {
      try {
        const resp = await fetch('/local/sheets/batch-delete', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ids })
        });
        if (!resp.ok) throw new Error(await resp.text());
        return { error: null };
      } catch (e) {
        console.error('[DB.deleteSheetsBatch local]', e);
        return { error: e };
      }
    } else {
      const { error } = await window.supabaseClient
        .from('sheets')
        .delete()
        .in('id', ids);
      return { error };
    }
  }

  // ── QUADRO ──────────────────────────────────────────────

  async function getBoard() {
    if (_mode === 'local') {
      try {
        const resp = await fetch('/local/board');
        const d    = await resp.json();
        return d?.cards || [];
      } catch (e) {
        console.error('[DB.getBoard local]', e);
        return [];
      }
    } else {
      if (!_currentUser) return [];
      const { data } = await window.supabaseClient
        .from('board_state')
        .select('cards')
        .eq('user_id', _currentUser.id)
        .single();
      return data?.cards || [];
    }
  }

  async function saveBoard(cards) {
    if (_mode === 'local') {
      try {
        await fetch('/local/board', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ cards })
        });
      } catch (e) {
        console.error('[DB.saveBoard local]', e);
      }
    } else {
      if (!_currentUser) return;
      await window.supabaseClient
        .from('board_state')
        .upsert(
          { user_id: _currentUser.id, cards, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
    }
  }

  // ── PASTAS ──────────────────────────────────────────────

  async function getFolders() {
    if (_mode === 'local') {
      try {
        const resp = await fetch('/local/folders');
        const data = await resp.json();
        return { folders: data.folders || [], assignments: data.assignments || {} };
      } catch (e) {
        console.error('[DB.getFolders local]', e);
        return { folders: [], assignments: {} };
      }
    } else {
      try {
        const raw = localStorage.getItem('codex_folders');
        if (raw) {
          const data = JSON.parse(raw);
          return { folders: data.folders || [], assignments: data.assignments || {} };
        }
      } catch (e) { console.error('[DB.getFolders supabase]', e); }
      return { folders: [], assignments: {} };
    }
  }

  async function saveFolders(folders, assignments) {
    const payload = { folders, assignments };
    if (_mode === 'local') {
      try {
        await fetch('/local/folders', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload)
        });
      } catch (e) {
        console.error('[DB.saveFolders local]', e);
      }
    }
    try {
      localStorage.setItem('codex_folders', JSON.stringify(payload));
    } catch (e) { console.error('[DB.saveFolders localStorage]', e); }
  }

  // ── API pública ─────────────────────────────────────────
  return {
    getMode, isLocal, isSupabase, setMode,
    getCurrentUser,
    initAuth, signOut,
    getSheets, insertSheets, updateSheet, deleteSheet, deleteSheetsBatch,
    getBoard, saveBoard,
    getFolders, saveFolders,
    // Expõe o user atual para leitura direta
    get user() { return _currentUser; }
  };
})();
