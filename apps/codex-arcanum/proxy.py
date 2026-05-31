"""
proxy.py — Backend Flask do Codex Arcanum
  - Serve o frontend (arquivos estáticos)
  - Proxy para a API do OpenRouter (IA)
  - Rotas REST para o banco de dados LOCAL (data/local_db.json)
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests, os, json, threading, tempfile
from pathlib import Path

app = Flask(__name__, static_folder='.')

try:
    CORS(app, origins="*")
except Exception:
    pass

# ── IA ────────────────────────────────────────────────────────
API_URL        = "https://openrouter.ai/api/v1/chat/completions"
API_KEY        = os.getenv("OPENROUTE_API_KEY")
APP_PUBLIC_URL = os.getenv("APP_PUBLIC_URL", "http://localhost:5000")
AI_MODEL       = "google/gemma-4-31b-it:free"

# ── Local DB ──────────────────────────────────────────────────
_SCRIPT_DIR   = Path(__file__).resolve().parent
LOCAL_DB_PATH = _SCRIPT_DIR / "data" / "local_db.json"
_db_lock = threading.Lock()
# Sem cache em memória: lemos sempre do disco para garantir consistência
# entre os múltiplos workers do Gunicorn. O arquivo é pequeno, sem problema.

print(f"[db] Caminho do banco: {LOCAL_DB_PATH}")
print(f"[db] Arquivo existe: {LOCAL_DB_PATH.exists()}")
if LOCAL_DB_PATH.exists():
    print(f"[db] Tamanho: {LOCAL_DB_PATH.stat().st_size / 1024:.1f} KB")

def _load_db():
    """Lê o banco do disco. Sempre. Sem cache — compatível com múltiplos workers."""
    with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_db(db):
    """Salva atomicamente: escreve num .tmp e substitui com os.replace()."""
    LOCAL_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = str(LOCAL_DB_PATH) + ".tmp"
    try:
        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(db, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, str(LOCAL_DB_PATH))
        size_kb = LOCAL_DB_PATH.stat().st_size / 1024
        print(f"[db] Salvo: {len(db.get('sheets', []))} fichas · {size_kb:.1f} KB")
    except Exception as e:
        print(f"[db] ERRO ao salvar: {e}")
        try: os.unlink(tmp_path)
        except OSError: pass
        raise

def _atomic_db_operation(func):
    with _db_lock:
        db = _load_db()
        try:
            result = func(db)
        except Exception:
            raise
        _save_db(db)
        return result

# _invalidate_cache removida: sem cache, sem necessidade

# ══════════════════════════════════════════════════════════════
# ROTAS ESTÁTICAS
# ══════════════════════════════════════════════════════════════

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    if path.startswith(('generate', 'local/')):
        return "Use método correto", 405
    return send_from_directory('.', path)

# ══════════════════════════════════════════════════════════════
# PROXY DE IA
# ══════════════════════════════════════════════════════════════

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    if not data or 'messages' not in data:
        return jsonify({"error": "Body inválido"}), 400

    headers = {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {API_KEY}",
        "X-Title":       "Codex-Arcanum",
        "HTTP-Referer":  APP_PUBLIC_URL
    }
    body = {"model": AI_MODEL, "max_tokens": 1200, "messages": data['messages']}

    print(f"[proxy] Modelo: {AI_MODEL} | Mensagens: {len(data['messages'])}")

    try:
        resp = requests.post(API_URL, headers=headers, json=body, timeout=60)
        print(f"[proxy] Resposta: {resp.status_code}")
        if resp.status_code == 200:
            return jsonify(resp.json())
        print(f"[proxy] ERRO: {resp.text}")
        return jsonify({"error": f"API retornou {resp.status_code}", "detail": resp.text}), resp.status_code
    except requests.exceptions.Timeout:
        return jsonify({"error": "Timeout. Tente novamente."}), 504
    except requests.exceptions.ConnectionError as e:
        return jsonify({"error": "Sem conexão com a API."}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════════════════
# LOCAL DB — SHEETS
# ══════════════════════════════════════════════════════════════

@app.route('/local/sheets', methods=['GET'])
def local_get_sheets():
    """Retorna todas as fichas do banco local."""
    db = _load_db()
    sheets = sorted(db['sheets'], key=lambda s: s.get('updated_at', ''), reverse=True)
    return jsonify(sheets)

@app.route('/local/sheets', methods=['POST'])
def local_insert_sheets():
    """Insere uma ou mais fichas. Espera JSON array."""
    body = request.json
    if not isinstance(body, list):
        body = [body]
    import uuid as _uuid
    from datetime import datetime, timezone

    def _op(db):
        inserted = []
        for sheet in body:
            if not sheet.get('nome'):
                continue
            now = datetime.now(timezone.utc).isoformat()
            new_sheet = {
                "id":         sheet.get('id') or str(_uuid.uuid4()),
                "user_id":    sheet.get('user_id', db['local_user']['id']),
                "nome":       sheet['nome'],
                "profile":    sheet.get('profile', 'especialista'),
                "nivel":      int(sheet.get('nivel', 1)),
                "na":         str(sheet.get('na', '1')),
                "avatar":     sheet.get('avatar', None),
                "data":       sheet.get('data', {}),
                "created_at": sheet.get('created_at', now),
                "updated_at": sheet.get('updated_at', now)
            }
            db['sheets'] = [s for s in db['sheets'] if s['id'] != new_sheet['id']]
            db['sheets'].append(new_sheet)
            inserted.append(new_sheet)
        return inserted

    inserted = _atomic_db_operation(_op)
    return jsonify(inserted), 201

@app.route('/local/sheets/batch-delete', methods=['POST'])
def local_batch_delete_sheets():
    """Remove múltiplas fichas de uma vez (atomicamente)."""
    body = request.json or {}
    ids  = set(body.get('ids', []))
    if not ids:
        return jsonify({"ok": True, "deleted": 0})

    def _op(db):
        before = len(db['sheets'])
        db['sheets'] = [s for s in db['sheets'] if s['id'] not in ids]
        return before - len(db['sheets'])

    deleted = _atomic_db_operation(_op)
    return jsonify({"ok": True, "deleted": deleted})

@app.route('/local/sheets/<sheet_id>', methods=['PUT'])
def local_update_sheet(sheet_id):
    """Atualiza uma ficha existente."""
    body = request.json
    from datetime import datetime, timezone

    def _op(db):
        idx = next((i for i, s in enumerate(db['sheets']) if s['id'] == sheet_id), None)
        if idx is None:
            return None, 404
        db['sheets'][idx].update({
            k: v for k, v in body.items()
            if k not in ('id', 'user_id', 'created_at')
        })
        db['sheets'][idx]['updated_at'] = datetime.now(timezone.utc).isoformat()
        return db['sheets'][idx], 200

    result, status = _atomic_db_operation(_op)
    if status == 404:
        return jsonify({"error": "Ficha não encontrada"}), 404
    return jsonify(result)

@app.route('/local/sheets/<sheet_id>', methods=['DELETE'])
def local_delete_sheet(sheet_id):
    """Remove uma ficha."""
    def _op(db):
        before = len(db['sheets'])
        db['sheets'] = [s for s in db['sheets'] if s['id'] != sheet_id]
        return len(db['sheets']) < before

    found = _atomic_db_operation(_op)
    if not found:
        return jsonify({"error": "Ficha não encontrada"}), 404
    return jsonify({"ok": True})

# ══════════════════════════════════════════════════════════════
# LOCAL DB — FOLDERS
# ══════════════════════════════════════════════════════════════

@app.route('/local/folders', methods=['GET'])
def local_get_folders():
    db = _load_db()
    return jsonify(db.get('folders', {"folders": [], "assignments": {}}))

@app.route('/local/folders', methods=['POST'])
def local_save_folders():
    body = request.json
    def _op(db):
        db['folders'] = body
    _atomic_db_operation(_op)
    return jsonify({"ok": True})

# ══════════════════════════════════════════════════════════════
# LOCAL DB — BOARD STATE
# ══════════════════════════════════════════════════════════════

@app.route('/local/board', methods=['GET'])
def local_get_board():
    db = _load_db()
    return jsonify(db.get('board_state', {"cards": []}))

@app.route('/local/board', methods=['POST'])
def local_save_board():
    body = request.json
    from datetime import datetime, timezone
    def _op(db):
        db['board_state'] = {
            "user_id":    db['local_user']['id'],
            "cards":      body.get('cards', []),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    _atomic_db_operation(_op)
    return jsonify({"ok": True})

# ══════════════════════════════════════════════════════════════
# LOCAL DB — INFO (usuário local)
# ══════════════════════════════════════════════════════════════

@app.route('/local/user', methods=['GET'])
def local_get_user():
    db = _load_db()
    return jsonify(db.get('local_user', {"id": "local-user", "name": "Local", "email": ""}))

@app.route('/local/persist', methods=['POST'])
def local_persist():
    """Força reescrita + verificação de integridade do DB em disco."""
    import time, hashlib
    db = _load_db()
    _save_db(db)
    with open(LOCAL_DB_PATH, 'r', encoding='utf-8') as f:
        disk_data = f.read()
    disk_db = json.loads(disk_data)
    disk_sheets = len(disk_db.get('sheets', []))
    mem_sheets = len(db.get('sheets', []))
    size_kb = LOCAL_DB_PATH.stat().st_size / 1024
    ok = disk_sheets == mem_sheets
    if not ok:
        print(f"[db] INTEGRIDADE FALHOU: disco={disk_sheets} mem={mem_sheets}")
    return jsonify({
        "ok": ok,
        "sheets": disk_sheets,
        "size_kb": round(size_kb, 1),
        "path": str(LOCAL_DB_PATH),
        "ts": time.time()
    })

# ══════════════════════════════════════════════════════════════
# INIT
# ══════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print("=" * 52)
    print("  Codex Arcanum — Servidor Flask")
    print(f"  Modelo IA: {AI_MODEL}")
    print(f"  DB Local:  {LOCAL_DB_PATH}")
    print("=" * 52)
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
