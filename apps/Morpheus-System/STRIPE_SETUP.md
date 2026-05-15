# Configurando Stripe no Morpheus

Este projeto usa Stripe Checkout para assinatura, Stripe Customer Portal para gerenciamento de cobranca e webhooks para liberar ou bloquear o sistema.

## 1. Criar produto e precos no Stripe

1. Entre no Stripe Dashboard em modo de teste.
2. Crie um produto chamado `Morpheus`.
3. Crie dois precos recorrentes:
   - mensal: `R$ 30 / mes`;
   - anual: `R$ 324 / ano`.
4. Copie os IDs dos precos. Eles comecam com `price_`.

## 2. Configurar variaveis de ambiente

Copie `.env.example` para `.env` e preencha:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_YEARLY=price_xxx
NEXT_PUBLIC_BILLING_REQUIRED=true
```

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET` no cliente.

Antes de subir o app, confirme se a URL publica do Supabase e a `service_role` sao do mesmo projeto. O `ref` aparece na URL:

```text
https://SEU-REF.supabase.co
```

## 3. Atualizar o banco no Supabase

Se o banco ainda estiver vazio, execute `supabase.sql` no SQL Editor do Supabase correto.

Se o banco ja tem `rooms`, `psychologists`, `reservations` e `admin_config`, execute `supabase-billing-patch.sql` para adicionar apenas a cobranca.

O SQL cria a tabela `billing_accounts`, a funcao `has_active_billing()` e politicas RLS que bloqueiam `rooms`, `psychologists`, `reservations` e `admin_config` quando a cobranca estiver ativa e a assinatura nao estiver em `active` ou `trialing`.

Durante testes, `billing_enforced` comeca como `false`. Depois que o checkout e o webhook estiverem funcionando, ative a cobranca no banco:

```sql
UPDATE billing_accounts
SET billing_enforced = true
WHERE id = 'default';
```

## 4. Se voce rodou SQL na conta errada

Use um destes arquivos no SQL Editor da conta errada:

- `supabase-billing-rollback.sql`: remove so a camada Stripe/billing e restaura as policies antigas, mantendo salas, profissionais, reservas e admin_config.
- `supabase-full-teardown.sql`: apaga tudo que o `supabase.sql` do Morpheus criou no schema publico. Use somente na conta errada.

## 5. Testar webhook localmente

Instale e autentique a Stripe CLI. Depois rode:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

A CLI vai imprimir um segredo comecando com `whsec_`. Coloque esse valor em `STRIPE_WEBHOOK_SECRET` no `.env`.

Suba o app:

```bash
docker compose up -d --build
```

Abra `http://localhost:3000/app`, assine pelo Checkout e use o cartao de teste `4242 4242 4242 4242`.

## 6. Configurar webhook em producao

Quando o app estiver em um dominio publico com HTTPS, crie um endpoint no Stripe Dashboard:

```text
https://seu-dominio.com/api/stripe/webhook
```

Eventos usados pelo Morpheus:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Copie o signing secret desse endpoint para `STRIPE_WEBHOOK_SECRET` no servidor.

## 7. Customer Portal

Ative o Stripe Customer Portal no Dashboard. O app usa `/api/stripe/portal` para abrir a area onde a clinica pode atualizar cartao, cancelar ou regularizar cobranca.

## Observacoes importantes

- A versao com Stripe precisa de runtime de servidor. GitHub Pages nao roda `/api/stripe/*`.
- No GitHub Pages, use `NEXT_PUBLIC_BILLING_REQUIRED=false` e `NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED=false`. Esse modo serve para testar UI e dados publicos via Supabase anon/RLS, sem checkout.
- Configure `MORPHEUS_SUPABASE_URL` e `MORPHEUS_SUPABASE_ANON_KEY` nos secrets do GitHub Actions. A anon key aparece no bundle do navegador por natureza; a protecao real precisa ficar nas policies RLS do Supabase.
- Nunca coloque `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET` em GitHub Pages ou em variaveis `NEXT_PUBLIC_*`.
- O projeto ainda e single-tenant. Para varias clinicas independentes, o proximo passo e adicionar autenticacao real, `clinic_id` nas tabelas e uma assinatura por clinica.
- A barreira existe em duas camadas: tela de bloqueio no React e politicas RLS no Supabase.
