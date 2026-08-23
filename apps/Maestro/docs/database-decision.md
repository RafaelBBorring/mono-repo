# Decisão de banco e armazenamento

Data da análise: 18 de julho de 2026.

## Decisão

Para o MVP, a melhor opção gratuita é **Supabase Free como plataforma transacional**, mantendo arquivos e imagens fora do PostgreSQL. Para testes pequenos, o Storage do próprio Supabase basta. Para boards grandes ou vários usuários gratuitos, a evolução recomendada é **Supabase + Cloudflare R2**.

O motivo não é o maior número de gigabytes isoladamente. O Maestro depende de Auth, PostgreSQL, RLS, relações, busca textual, `pgvector`, Storage privado e funções serverless. O Supabase entrega esse conjunto com menor complexidade operacional.

## Limites atuais verificados

| Opção | Cota gratuita relevante | Adequação ao Maestro |
|---|---:|---|
| Supabase | 500 MB de database, 1 GB de arquivos, 5 GB de egress | Melhor conjunto funcional; exige controle de tamanho |
| Neon | 0,5 GB por projeto, 100 CU-horas e 5 GB de transferência | Bom PostgreSQL, mas não aumenta o espaço por projeto e exigiria serviços separados |
| Cloudflare D1 | 5 GB totais, 5 milhões de rows lidas/dia | Mais espaço, porém é SQLite distribuído; exigiria reescrever RLS, Auth e busca vetorial |
| Cloudflare R2 | 10 GB-mês, 1 milhão de writes e 10 milhões de reads | Excelente para imagens, recortes e composites; não substitui o banco relacional |

O Supabase coloca projetos Free em modo somente leitura quando o database ultrapassa 500 MB. Portanto, imagens originais, thumbnails e composites nunca devem entrar em colunas `bytea` ou base64.

## Estratégia de capacidade

- PostgreSQL: usuários, projetos, fontes, versões, coordenadas, entidades, claims, evidências textuais e fila.
- Object storage: imagens temporárias, miniaturas, recortes e composites.
- Deduplicação por hash para versões e assets.
- Não copiar o original do Miro quando uma análise temporária for suficiente.
- Apagar composites após a extração e manter apenas evidência pequena quando permitido.
- Gerar embeddings apenas para chunks relevantes.
- Começar com busca full-text; habilitar vetores depois de medir tokens e qualidade.
- Alertas internos em 60%, 75% e 85% da cota do database.
- Pausar importações antes do limite, nunca deixar o banco entrar em read-only.

## Estimativa inicial para o teste real

Um board de alguns milhares de itens tende a caber no Supabase Free se as imagens não forem duplicadas no banco. A quantidade real depende do volume textual, número de versões, chunks, índices e embeddings. A decisão comercial deve ser tomada depois de executar uma importação real e medir:

```sql
select pg_size_pretty(pg_database_size(current_database()));

select
  relname,
  pg_size_pretty(pg_total_relation_size(relid)) as total
from pg_catalog.pg_statio_user_tables
order by pg_total_relation_size(relid) desc;
```

## Gatilho de migração ou upgrade

- Permanecer no Free durante validação individual.
- Adicionar R2 antes de armazenar thumbnails de múltiplos usuários.
- Migrar o projeto Supabase para Pro antes da comercialização pública, pois o Free pausa por inatividade e não oferece SLA adequado.
- Só considerar Neon se Auth, Functions e Storage já estiverem desacoplados.
- Só considerar D1 se o produto abandonar dependências PostgreSQL/pgvector e aceitar uma reescrita relevante.

Fontes oficiais: [Supabase Pricing](https://supabase.com/pricing), [comportamento do limite do database](https://supabase.com/docs/guides/platform/database-size), [Neon Pricing](https://neon.com/pricing), [Cloudflare D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/) e [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/).
