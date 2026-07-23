# Configuração de produção — Morpheus

O Morpheus usa Supabase Auth e RLS para isolamento entre clínicas, Stripe Checkout para novas assinaturas, Customer Portal para manutenção e webhooks assinados como única fonte de liberação dos planos.

## 1. Banco e autenticação

Execute as migrations do diretório `supabase/migrations` na ordem, incluindo `20260713_morpheus_security_hardening.sql` e `20260714_morpheus_integrity_recovery.sql`.

Essa migração ativa:

- identidade via Supabase Auth;
- isolamento multi-tenant por `clinic_id` e `auth.uid()`;
- limites de salas, profissionais e clínicas no banco;
- bloqueio de conflitos de reserva com lock transacional;
- trilha de recuperação em `morpheus_audit_log`;
- idempotência de webhooks em `stripe_webhook_events`;
- isolamento relacional entre clínica, sala, profissional e reserva;
- proteção do último administrador e concorrência nos limites de plano;
- reaproveitamento seguro do Checkout de trial abandonado;
- consumo atômico de cupons;
- cupom de teste `MORPHEUS99` com 99% de desconto.

Cadastros legados baseados em `password_hash` não são mais aceitos como sessão. Para contas antigas, crie o usuário correspondente no Supabase Auth e associe seu UUID em `users.id` e `clinic_doctors.user_id` antes de ativar a migração em produção.

Para habilitar Google, abra Supabase Dashboard > Authentication > Providers > Google, informe o Client ID/Secret do Google Cloud e adicione estas URLs permitidas:

```text
http://localhost:3000/app
https://seu-dominio.com/app
```

Adicione também as URLs em Authentication > URL Configuration.

## 2. Produtos e preços no Stripe

Crie os seis preços recorrentes do produto Morpheus:

```text
Essential mensal: R$ 30
Essential anual:  R$ 288
Pro mensal:       R$ 50
Pro anual:        R$ 480
Elite mensal:     R$ 80
Elite anual:      R$ 768
```

O Customer Portal deve permitir atualização do cartão, cancelamento e troca entre esses preços. O webhook deriva o plano também pelo Price ID, portanto uma troca feita no portal atualiza os limites no banco.

## 3. Ambiente

Copie `.env.example` para `.env` e preencha todas as chaves reais:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ESSENTIAL_MONTHLY=price_xxx
STRIPE_PRICE_ESSENTIAL_YEARLY=price_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_ELITE_MONTHLY=price_xxx
STRIPE_PRICE_ELITE_YEARLY=price_xxx
NEXT_PUBLIC_BILLING_REQUIRED=true
NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED=true
NEXT_PUBLIC_SERVER_API_AVAILABLE=true
```

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET` em variáveis `NEXT_PUBLIC_*`.

## 4. Webhook local

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
docker compose up -d --build
```

Copie o `whsec_...` fornecido pela Stripe CLI para o `.env`. Em modo teste, use o cartão `4242 4242 4242 4242` e o cupom `MORPHEUS99`.

Em modo live, cartões de teste não funcionam. O desconto de 99% deixa o Pro mensal em R$ 0,50 e o Elite em R$ 0,80. Use um desses planos para um teste live de baixo valor; o Essential cairia para R$ 0,30, abaixo do mínimo de cobrança em BRL.

Eventos necessários:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

O trial de sete dias existe apenas no Essential, exige Checkout Stripe e só pode ser reivindicado uma vez por clínica. A interface nunca libera o painel com base no retorno do navegador: apenas o webhook assinado altera `stripe_status` para `trialing` ou `active`.

O endpoint `GET /api/health` verifica aplicação, acesso ao banco, presença do esquema endurecido e conectividade com o preço Essential no Stripe sem expor credenciais.

## 5. Produção

Configure o endpoint HTTPS:

```text
https://seu-dominio.com/api/stripe/webhook
```

Suba com:

```bash
docker compose up -d --build
```

Valide depois do deploy:

1. login por senha e Google;
2. criação de clínica e trial Essential;
3. pagamento com `MORPHEUS99` em modo teste;
4. recebimento do webhook e liberação do painel;
5. limites por plano;
6. cancelamento e troca pelo portal;
7. bloqueio da clínica após status inválido ou vencimento.

Payment Links públicos continuam disponíveis apenas para export estático. Eles não substituem o fluxo seguro de Docker/API e não devem ser usados para conceder acesso automaticamente.
