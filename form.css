# ============================================================
# Dockerfile — Codex Arcanum
# ============================================================
# Imagem base: Python 3.12 slim (menor tamanho, sem extras)
FROM python:3.12-slim

# ── Metadados ────────────────────────────────────────────────
LABEL description="Codex Arcanum — Gerador de Fichas RPG"

# ── Variáveis de ambiente internas do container ──────────────
# PORT: porta em que o Gunicorn vai escutar dentro do container
# PYTHONUNBUFFERED: força logs imediatos no terminal (sem buffer)
# PYTHONDONTWRITEBYTECODE: evita gerar arquivos .pyc desnecessários
ENV PORT=5000 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# ── Diretório de trabalho dentro do container ────────────────
WORKDIR /app

# ── Instala dependências Python ──────────────────────────────
# Copia apenas o requirements.txt primeiro para aproveitar o
# cache do Docker: se as deps não mudarem, essa camada é reutilizada.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copia o código da aplicação ──────────────────────────────
COPY . .

# ── Porta exposta ────────────────────────────────────────────
EXPOSE 5000

# ── Comando de inicialização ─────────────────────────────────
# Gunicorn: servidor WSGI de produção (substitui o flask run).
#   proxy:app   → arquivo proxy.py, objeto Flask chamado app
#   --workers 2 → 2 processos paralelos (bom para VPS com 1-2 CPUs)
#   --threads 4 → 4 threads por worker
#   --timeout 120 → mata requisições travadas após 120s
CMD gunicorn proxy:app \
    --workers 2 \
    --threads 4 \
    --timeout 120 \
    --bind 0.0.0.0:$PORT \
    --access-logfile - \
    --error-logfile -
