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
# ── Volume para persistir o banco local entre rebuilds ───────
# O docker-compose monta ./data do host aqui dentro.
# Sem isso, o local_db.json seria sobrescrito a cada "docker build".
VOLUME ["/app/data"]

# ── Comando de inicialização ─────────────────────────────────
# --workers 1: essencial para consistência do banco local em arquivo.
#   Com mais de 1 worker, cada processo teria seu próprio estado de
#   leitura e as escritas poderiam se sobrepor de forma imprevisível.
# --threads 8: compensa o worker único — requisições paralelas via threads.
CMD gunicorn proxy:app \
    --workers 1 \
    --threads 8 \
    --timeout 120 \
    --bind 0.0.0.0:$PORT \
    --access-logfile - \
    --error-logfile -
