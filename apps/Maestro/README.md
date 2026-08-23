# Maestro Creative Intelligence

O Maestro é um SaaS independente para transformar fontes criativas dispersas em uma memória consultável, fundamentada e revisável. O MVP prioriza mestres de RPG e integra o Miro por OAuth, REST API e um complemento opcional pelo Web SDK.

O projeto não reutiliza nem altera o System-Olympo.

## O que já está implementado

- Landing page comercial e workspace responsivo com três áreas principais: Conversar, Árvore da Vida e Configurações.
- Login por senha para contas existentes e criação de conta por link seguro via Supabase Auth.
- Arquitetura multiusuário e multi-workspace protegida por RLS.
- Projetos, planos, quotas e isolamento de dados.
- OAuth do Miro por equipe e seleção de múltiplos boards.
- Inventário paginado e sincronização incremental por hash.
- Jobs persistentes, idempotentes e retomáveis.
- Importação por texto colado e arquivos TXT/Markdown.
- Segmentação por frames e quadtree para boards densos.
- Processamento separado de texto, imagem e regiões espaciais.
- Conhecimento classificado como explícito, visual, espacial, inferido, fornecido pelo autor ou conflitante.
- Episódios, campanhas e eventos estruturados com ordem, datas explícitas, lacunas e proveniência.
- Yggdrasil como mapa mental interativo, com prévia em hover/foco e inspector completo no clique.
- Chat nos modos Cânone, Investigar e Criar, com citações validadas.
- Chaves BYOK criptografadas no backend e perfil Low, Medium ou Max.
- Captura complementar pelo Web SDK para geometria e nomes não expostos pela REST API.
- Ambiente Docker/Nginx e suíte de testes de factualidade.

## Executar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`. Sem configuração Supabase, o projeto usa dados locais; com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, o login usa o backend real.

No Docker:

```bash
docker compose up -d --build
```

A aplicação fica em `http://localhost:5012`.

Perguntas úteis para validar a demonstração:

1. Pergunte `Quem é o feiticeiro Silas?`.
2. Pergunte `Resuma o último episódio de Nova Orleans`.
3. Pergunte `Como se mata um vampiro?`.
4. Abra a **Árvore da Vida**, passe por um nó e abra seu inspector.
5. Em **Configurações**, verifique plano e estados honestos dos conectores.

As duas primeiras respostas separam fato de inferência. A terceira recusa preencher a lacuna com folclore genérico.

## Ativar o backend real

### Quem fornece cada credencial

| Credencial | Responsável | Uso |
|---|---|---|
| `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` | Operador do Maestro | Cliente web, autenticação e acesso protegido por RLS. |
| `SUPABASE_ACCESS_TOKEN` | Operador do Maestro | Somente CLI/Management API durante deploy. Nunca é enviado às Edge Functions. |
| `SUPABASE_SERVICE_ROLE_KEY` | Operador do Maestro | Edge Functions e processamento interno. Nunca vai para o navegador. |
| `OPENROUTER_API_KEY` | Operador do Maestro | Modelo padrão e análise visual. Usuários podem cadastrar uma chave textual própria dentro do painel. |
| `MIRO_CLIENT_ID` e `MIRO_CLIENT_SECRET` | Operador do Maestro | Um único aplicativo oficial do Maestro no Miro. O usuário final não cria API key. |
| `INTEGRATION_ENCRYPTION_KEY` | Operador do Maestro | Criptografia de tokens OAuth e chaves BYOK. |

Cada usuário clica em **Conectar Miro**, entra na própria conta, escolhe o time e autoriza o aplicativo. O Maestro recebe tokens limitados às permissões daquele usuário e lista apenas os boards aos quais ele já possui acesso. O escopo recomendado para o MVP é `boards:read`; `boards:write` não é necessário enquanto o produto não escrever de volta no board.

A demonstração local usa exclusivamente `src/data/demoData.js`. Ela não inicia OAuth, não consulta MCP e não acessa qualquer conta Miro externa.

1. Crie um projeto Supabase exclusivo para o Maestro.
2. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Autentique a CLI oficial sem compartilhar o PAT em chat ou arquivos versionados:

```bash
npx supabase login
```

Como alternativa para automação local, defina `SUPABASE_ACCESS_TOKEN` somente no `.env` ignorado pelo Git e Docker.

4. Aplique todas as migrations, segredos selecionados e Edge Functions:

```bash
npm run supabase:deploy
```

O script faz um `db push --dry-run` antes da escrita, usa um arquivo temporário para os segredos e o remove ao terminar. O fluxo manual equivalente para publicar funções é:

```bash
supabase functions deploy miro-oauth --no-verify-jwt
supabase functions deploy miro-import
supabase functions deploy ingestion-worker
supabase functions deploy maestro-chat
supabase functions deploy provider-config
supabase functions deploy miro-sdk-capture
supabase functions deploy manual-source
```

5. Configure os segredos do servidor presentes em `.env.example`. `INTEGRATION_ENCRYPTION_KEY` deve ser uma chave aleatória longa e nunca pode ser exposta como variável Vite.
6. Crie um app no portal de desenvolvedores do Miro e defina o redirect URI como a URL pública da função `miro-oauth`.
7. Configure `APP_URL` com a origem pública do frontend.

Para provisionar contas administrativas e de teste de forma idempotente, passe as senhas somente no processo atual:

```bash
MAESTRO_OWNER_PASSWORD="..." MAESTRO_TEST_PASSWORD="..." npm run supabase:provision-users
```

O padrão textual é um NVIDIA Nemotron gratuito compatível com saída estruturada; a visão usa o NVIDIA Nemotron Omni, com fallback multilíngue e, por último, `openrouter/free`. Os modelos ficam configuráveis por ambiente porque disponibilidade gratuita muda. O worker agrupa textos, imagens e regiões por chamada, preserva o cursor e pode retomar lotes parciais. O [roteador gratuito](https://openrouter.ai/docs/guides/routing/routers/free-router) não oferece SLA; para produção, configure orçamento, privacidade e fallback adequados.

## Captura complementar do Miro

A REST API é a fonte principal. Para imagens coladas, itens não suportados ou geometria ausente, configure `VITE_MIRO_WEB_SDK_URL` com a URL pública da rota de captura:

```text
VITE_MIRO_WEB_SDK_URL=https://SEU_DOMINIO/#/app/miro-capture
```

Cada fonte Miro exibe um botão que acrescenta automaticamente `projectId` e `sourceId` a essa URL. Use o link resultante como painel do app no board correspondente. A tela coleta posição, tamanho, rotação, parent, título e o melhor nome de arquivo disponível e envia lotes autenticados ao Maestro. Ela não escreve no board.

## Verificação

```bash
npm run lint
npm test
npm run build
npx deno check supabase/functions/*/index.ts
npx supabase db reset --local --no-seed
npx supabase db lint --local --level warning
npx supabase test db
```

## Documentação

- [Arquitetura e factualidade](docs/architecture.md)
- [Decisão de banco e armazenamento](docs/database-decision.md)
