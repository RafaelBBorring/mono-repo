# Guia Completo de Migração
## Railway → Mono-Repo + VPS com Dokploy

---

## O que você vai fazer, em resumo

```
Repositório atual (CodexArcanum)
         ↓
Novo repositório (mono-repo) no GitHub
         ↓
VPS com Docker instalado
         ↓
Dokploy gerencia o deploy automático
```

---

## PARTE 1 — Criando o novo repositório no GitHub

### Passo 1.1 — Crie o repositório "mono-repo" no GitHub

1. Acesse https://github.com/new
2. Preencha:
   - **Repository name:** `mono-repo`
   - **Visibility:** Private (recomendado) ou Public
   - **NÃO marque** "Add a README file" — você já tem um
3. Clique em **Create repository**
4. Anote a URL do repositório. Será algo como:
   `https://github.com/SEU_USUARIO/mono-repo.git`

---

### Passo 1.2 — Clone o repositório vazio na sua máquina

Abra o terminal e execute:

```bash
git clone https://github.com/SEU_USUARIO/mono-repo.git
cd mono-repo
```

---

### Passo 1.3 — Copie os arquivos do projeto para o mono-repo

Você recebeu um ZIP com a estrutura já pronta. Extraia-o e copie
a pasta `mono-repo/` para dentro do repositório clonado.

A estrutura final deve ficar assim:

```
mono-repo/
├── .gitignore
├── README.md
└── apps/
    └── codex-arcanum/
        ├── Dockerfile
        ├── .dockerignore
        ├── .env.example
        ├── proxy.py
        ├── requirements.txt
        ├── index.html
        ├── css/
        │   ├── form.css
        │   └── sheet.css
        └── js/
            ├── api.js
            ├── data.js
            ├── export.js
            ├── main.js
            └── sheet.js
```

---

### Passo 1.4 — Faça o primeiro commit e envie ao GitHub

```bash
git add .
git commit -m "feat: estrutura inicial do mono-repo com Codex Arcanum"
git push origin main
```

Confirme no GitHub que os arquivos apareceram no repositório.

---

## PARTE 2 — Preparando a VPS

> Esta parte assume que você já tem uma VPS rodando (DigitalOcean,
> Hetzner, Vultr, Hostinger etc.) com Ubuntu 22.04 ou 24.04.

### Passo 2.1 — Acesse sua VPS via SSH

```bash
ssh root@IP_DA_SUA_VPS
```

---

### Passo 2.2 — Instale o Docker

Execute os comandos abaixo **um de cada vez**:

```bash
# Atualiza os pacotes do sistema
apt update && apt upgrade -y

# Instala dependências do Docker
apt install -y ca-certificates curl gnupg lsb-release

# Adiciona a chave oficial do Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Adiciona o repositório do Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instala o Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verifica se funcionou (deve mostrar a versão)
docker --version
```

---

### Passo 2.3 — Instale o Dokploy

Execute na VPS:

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Aguarde a instalação completar. Ao final, o terminal mostrará
uma URL como:

```
Dokploy instalado com sucesso!
Acesse: http://IP_DA_SUA_VPS:3000
```

Abra essa URL no navegador para criar sua conta de administrador.
**Guarde bem o usuário e senha criados.**

---

## PARTE 3 — Configurando o Dokploy

### Passo 3.1 — Conecte o GitHub ao Dokploy

1. No painel do Dokploy, vá em **Settings → Git Providers**
2. Clique em **Add GitHub**
3. Siga o fluxo de autorização OAuth do GitHub
4. Ao final, o Dokploy poderá acessar seus repositórios

---

### Passo 3.2 — Crie um novo projeto no Dokploy

1. Clique em **Projects → New Project**
2. Nome: `mono-repo` (ou qualquer nome que preferir)
3. Clique em **Create**

---

### Passo 3.3 — Crie um serviço para o Codex Arcanum

Dentro do projeto criado:

1. Clique em **Add Service → Application**
2. Preencha:
   - **Name:** `codex-arcanum`
   - **Provider:** GitHub
   - **Repository:** selecione `SEU_USUARIO/mono-repo`
   - **Branch:** `main`
3. Clique em **Create**

---

### Passo 3.4 — Configure o Build Path

Esta é a parte mais importante do Mono-Repo:
o Dokploy precisa saber em qual subpasta está o Dockerfile.

1. Na aba **General** do serviço `codex-arcanum`:
   - **Build Type:** Dockerfile
   - **Dockerfile Path:** `apps/codex-arcanum/Dockerfile`
   - **Build Context:** `apps/codex-arcanum`

> **Por que isso é importante?**
> Sem essa configuração, o Dokploy tentaria rodar o Dockerfile
> na raiz do repositório, onde ele não existe.
> Apontando para a subpasta correta, cada projeto do mono-repo
> pode ter seu próprio Dockerfile independente.

---

### Passo 3.5 — Configure as variáveis de ambiente

Na aba **Environment** do serviço:

Clique em **Add Variable** e adicione as seguintes:

| Nome | Valor |
|------|-------|
| `OPENROUTE_API_KEY` | `sk-or-v1-SUA_CHAVE_AQUI` |
| `APP_PUBLIC_URL` | `https://codex.seudominio.com` (ou o IP da VPS por enquanto) |
| `PORT` | `5000` |

> **Atenção:** Nunca coloque a chave de API diretamente no código
> ou no Git. Sempre use variáveis de ambiente como feito aqui.

---

### Passo 3.6 — Configure a porta

Na aba **Network** do serviço:

- **Container Port:** `5000`
- **Protocol:** HTTP

Se você tiver um domínio configurado, adicione-o aqui também.

---

### Passo 3.7 — Faça o primeiro deploy

1. Vá na aba **Deployments**
2. Clique em **Deploy**
3. Aguarde — o Dokploy irá:
   - Clonar o repositório
   - Navegar até `apps/codex-arcanum/`
   - Executar o `docker build`
   - Subir o container

Você pode acompanhar os logs em tempo real na mesma tela.

---

## PARTE 4 — Verificando se está funcionando

### Passo 4.1 — Teste o acesso

Após o deploy terminar com sucesso, acesse:

```
http://IP_DA_SUA_VPS:PORTA_EXTERNA
```

A porta externa é definida automaticamente pelo Dokploy
(ou você pode configurar na aba Network).

---

### Passo 4.2 — Verifique os logs

Se algo não funcionar, na aba **Logs** do serviço você verá
mensagens como:

```
[proxy] Enviando para: https://openrouter.ai/api/v1/chat/completions
[proxy] Modelo: meta-llama/Llama-3.3-70B-Instruct
[proxy] Resposta da API: 200
```

Se aparecer erro 401, a `OPENROUTE_API_KEY` está incorreta.
Se aparecer erro de conexão, verifique se a VPS tem acesso à internet.

---

## PARTE 5 — Deploy automático (CI/CD)

### Passo 5.1 — Ative o Auto Deploy

Na aba **General** do serviço no Dokploy:

- Ative a opção **Auto Deploy**
- Copie o **Webhook URL** gerado

---

### Passo 5.2 — Configure o Webhook no GitHub

1. No seu repositório GitHub, vá em
   **Settings → Webhooks → Add webhook**
2. Preencha:
   - **Payload URL:** cole a URL copiada do Dokploy
   - **Content type:** `application/json`
   - **Events:** selecione "Just the push event"
3. Clique em **Add webhook**

A partir de agora, **toda vez que você fizer `git push` no GitHub,
o Dokploy automaticamente fará um novo deploy** — igual ao Railway.

---

## PARTE 6 — Adicionando um novo projeto ao Mono-Repo

Quando você quiser adicionar um segundo projeto:

```
mono-repo/
└── apps/
    ├── codex-arcanum/    ← existente
    └── novo-projeto/     ← novo
        ├── Dockerfile
        └── (arquivos do projeto)
```

No Dokploy:
1. Crie um novo serviço dentro do mesmo projeto
2. Aponte **Build Context** para `apps/novo-projeto`
3. Configure as variáveis de ambiente do novo projeto
4. Deploy

Cada projeto tem seu próprio container, porta e ciclo de deploy independente.

---

## Resumo dos arquivos e suas funções

| Arquivo | Para que serve |
|---------|----------------|
| `Dockerfile` | Instrução de como empacotar a aplicação em container |
| `.dockerignore` | Lista o que NÃO deve ir para dentro do container |
| `.env.example` | Modelo das variáveis de ambiente necessárias |
| `.gitignore` | Lista o que NÃO deve ir para o Git |
| `proxy.py` | Servidor Flask que serve o frontend e faz proxy da API |
| `requirements.txt` | Lista as dependências Python necessárias |

---

## Diferenças entre Railway e Dokploy/VPS

| | Railway | Dokploy + VPS |
|--|---------|---------------|
| Infraestrutura | Gerenciada por eles | Você controla |
| Custo | Pago por uso | Custo fixo da VPS |
| Config de deploy | `Procfile` | `Dockerfile` |
| Variáveis | Painel do Railway | Painel do Dokploy |
| Domínio | Automático (`.railway.app`) | Você configura |
| Logs | Painel Railway | Painel Dokploy |
| Auto-deploy | Nativo | Via webhook GitHub |
