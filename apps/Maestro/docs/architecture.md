# Arquitetura do MVP

## Princípio central

Confiança numérica e natureza da informação são dimensões diferentes. Uma inferência espacial com 95% de confiança continua sendo uma inferência.

O Maestro registra sete classes epistemológicas:

| Classe | Significado | Pode entrar automaticamente no cânone? |
|---|---|---|
| `explicit_text` | Declaração literal em texto | Sim, mantendo a fonte |
| `explicit_metadata` | Título ou propriedade entregue pela fonte | Sim, mantendo a fonte |
| `visual_observation` | Algo que aparenta estar em uma imagem | Não |
| `spatial_inference` | Hipótese baseada em proximidade ou frame | Não |
| `model_inference` | Dedução sem declaração literal | Não |
| `user_assertion` | Informação fornecida pelo autor | Sim, após confirmação |
| `conflicted` | Evidências incompatíveis | Não |

O estado editorial é separado: `proposed`, `accepted`, `rejected` ou `superseded`.

## Fluxo do Miro

1. OAuth autoriza uma equipe do Miro e guarda tokens criptografados.
2. O usuário escolhe um ou mais boards acessíveis.
3. A API REST pagina itens em lotes de 50.
4. Cada item recebe um hash canônico que exclui URLs temporárias; uma nova leitura só reprocessa versões diferentes.
5. Coordenadas de filhos são convertidas para o espaço global do board.
6. Frames formam regiões naturais; áreas livres são divididas por quadtree.
7. Texto, imagem e região viram chunks independentes, agrupados e retomáveis; documentos longos são divididos com overlap.
8. Análises produzem evidências, entidades, claims, episódios, eventos e perguntas abertas.
9. Relações incertas entram na central de revisão.
10. Perguntas temporais recuperam primeiro eventos estruturados e suas evidências ativas; o chat valida cada ID citado, deriva o estado de fundamentação no servidor e persiste um snapshot da citação.

Como os webhooks experimentais do Miro foram removidos em dezembro de 2025, o MVP usa sincronização manual, polling agendável e comparação por `item.id`, `modifiedAt` e hash.

## Caso do cemitério

Uma imagem de cemitério próxima a retratos permite registrar:

- Observação visual: a imagem aparenta mostrar um cemitério.
- Metadado: os retratos possuem títulos associados a personagens.
- Inferência espacial: esses elementos estão agrupados.
- Hipótese: os personagens podem estar associados a uma cena no cemitério.
- Lacuna: motivo, ações, conflito, resultado e momento não foram documentados.

A resposta correta é: “O board sugere uma associação com uma cena no cemitério, mas não registra o que aconteceu.” O Maestro então pergunta ao autor.

## Segurança

- Toda tabela operacional carrega `workspace_id`.
- Políticas RLS separam leitura de membro, curadoria de editor e administração de owner/admin.
- Edge Functions validam o JWT e o acesso ao projeto.
- Tokens OAuth e chaves BYOK usam AES-GCM com chave exclusiva do servidor.
- Segredos nunca são retornados ao navegador nem armazenados no `localStorage`.
- Endpoints personalizados de IA usam allowlist para impedir SSRF.
- Operações canônicas geram revisão e trilha de auditoria.
- Evidências são imutáveis; uma nova sincronização as marca como superseded sem apagar citações históricas.
- Chunks são reivindicados atomicamente e cotas mensais são reservadas sob lock transacional.

## Limites honestos do MVP

- A API REST e o Web SDK do Miro não cobrem integralmente todos os tipos de item.
- O nome original de um arquivo de imagem não é garantido pela REST API.
- A geometria de imagens coladas pode exigir a captura Web SDK.
- O `openrouter/free` é adequado para validação e baixo volume, não oferece SLA.
- A cota do roteador gratuito pode exigir várias sessões para um board grande; o status parcial informa exatamente o que ficou pendente.
- O worker Edge processa um chunk por chamada; uma implantação comercial deve migrar o executor para um worker durável sem alterar o esquema da fila.
- A primeira versão usa busca textual fundamentada. A coluna `pgvector` está pronta para embeddings, mas o provedor de embedding deve ser escolhido após medir o board real.
