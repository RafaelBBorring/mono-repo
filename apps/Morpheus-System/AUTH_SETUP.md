# Morpheus Auth

## Estado atual

- Site URL: `https://morpheus.olympo.quest`
- Redirects autorizados: produção e localhost
- Cadastro por e-mail: habilitado
- Auto-confirm: temporariamente habilitado para testes
- Google OAuth: interface pronta, provider aguardando credenciais

## Google OAuth

Crie um cliente OAuth do tipo **Web application** no Google Auth Platform.

Origem JavaScript autorizada:

```text
https://morpheus.olympo.quest
```

URI de redirecionamento autorizada:

```text
https://wjwjbfzusppinjlyxznk.supabase.co/auth/v1/callback
```

Preencha no `.env`:

```text
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
```

Depois disso, o provider pode ser ativado pela Management API usando o
`SUPABASE_ACCESS_TOKEN` já guardado localmente.

## E-mail em produção

O SMTP padrão do Supabase é limitado a dois envios por hora e não é indicado
para usuários externos. Antes do lançamento, configure um SMTP próprio no
Supabase e desative o auto-confirm para voltar a exigir confirmação do e-mail.
