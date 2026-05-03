# Morpheus - Plataforma SaaS de Gestão Clínica

> **Status**: FASE 1 - MVP em desenvolvimento
> **Documento**: Veja [PRD_MORPHEUS.md](./PRD_MORPHEUS.md) para especificações completas

## 📋 Descrição

Morpheus é uma plataforma SaaS moderna para gestão de consultórios de psicologia. Ele substitui sistemas legados por uma aplicação web segura, intuitiva e escalável.

### Principais Funcionalidades (FASE 1)

- ✅ Autenticação segura com NextAuth.js
- ✅ Multi-tenancy por linha de banco de dados
- ✅ Gestão de salas com calendário (FullCalendar)
- ✅ Cadastro de psicólogos com escala semanal
- ✅ Cadastro de clientes
- ✅ Agendamento de consultas sem conflito
- ✅ Auditoria completa de ações
- ✅ Conformidade LGPD (consentimentos granulares)

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+ ou superior
- Docker e Docker Compose
- npm ou yarn

### 1. Iniciar Banco de Dados

```bash
docker-compose up -d
```

Isso inicia um PostgreSQL em `localhost:5432` com as credenciais:
- **Usuario**: morpheus
- **Senha**: morpheus_dev_password_123
- **Banco**: morpheus

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Banco de Dados

```bash
# Gerar cliente Prisma
npm run db:generate

# Executar migrações
npm run db:push

# Seed com dados de desenvolvimento
npm run db:seed
```

### 4. Iniciar Servidor de Desenvolvimento

```bash
npm run dev
```

Acesse http://localhost:3000

## 🔑 Credenciais de Teste (após seed)

```
Email: admin@clinica-demo.com
Senha: admin123
```

## 📁 Estrutura do Projeto

```
morpheus/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Páginas de autenticação
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/             # Dashboard protegido
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── rooms/
│   │   ├── psychologists/
│   │   ├── clients/
│   │   └── appointments/
│   ├── api/                     # API Routes
│   │   ├── auth/
│   │   ├── rooms/
│   │   ├── psychologists/
│   │   ├── clients/
│   │   └── appointments/
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── components/                   # Componentes React reutilizáveis
│   └── dashboard/
├── lib/                         # Utilitários e lógica compartilhada
│   ├── prisma.ts               # Cliente Prisma
│   ├── auth.ts                 # Utilitários de autenticação
│   ├── schemas.ts              # Validações com Zod
│   ├── validators/             # Validadores específicos (CPF, etc.)
│   └── context/                # Context de server (tenant, user)
├── services/                    # Lógica de negócio
│   ├── appointment.service.ts
│   └── roomBooking.service.ts
├── prisma/
│   ├── schema.prisma           # Schema do banco de dados
│   └── seed.ts                 # Dados iniciais
├── styles/                      # CSS e Tailwind
│   └── globals.css
├── auth.ts                      # Configuração NextAuth
├── middleware.ts                # Middleware de proteção de rotas
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── package.json
├── docker-compose.yml
└── README.md
```

## 🔐 Autenticação & Segurança

### Stack de Auth

- **Provedor**: NextAuth.js v5 com Credentials Provider
- **Hash**: bcryptjs com cost factor 12
- **Sessions**: JWT com refresh token rotativo
- **Proteção**: Middleware Next.js em todas as rotas `/dashboard`

### Checklist de Segurança

- ✅ Senhas com hash bcrypt (nunca plaintext)
- ✅ HTTPS ready (configurável em produção)
- ✅ Cookies com flags `HttpOnly`, `Secure`, `SameSite`
- ✅ CSRF protection via NextAuth
- ✅ SQL injection prevention (Prisma parametrizado)
- ✅ Rate limiting (futuro - FASE 2)

## 🗄️ Schema do Banco de Dados

### Modelos Principais

- **Tenant**: Multi-tenancy - isolamento de dados por organização
- **User**: Usuários do sistema (SUPER_ADMIN, ADMIN, RECEPTIONIST, PSYCHOLOGIST)
- **Psychologist**: Psicólogos com escala semanal
- **Client**: Clientes associados a psicólogos
- **Appointment**: Consultas (SCHEDULED, COMPLETED, NO_SHOW, CANCELLED)
- **Room**: Salas de atendimento
- **RoomBooking**: Reservas de salas
- **AuditLog**: Log de todas as ações (LGPD compliance)

## 📝 API Routes (Implementadas)

### Auth

- `POST /api/auth/register` - Criar conta nova
- `POST /api/auth/[...nextauth]` - NextAuth handlers

### Em Desenvolvimento

- `GET /api/rooms` - Listar salas
- `POST /api/rooms` - Criar sala
- `GET /api/rooms/[roomId]/bookings` - Bookings da sala
- `POST /api/psychologists` - Cadastrar psicóloga
- `GET /api/clients` - Listar clientes
- `POST /api/appointments` - Agendar consulta

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev                    # Inicia servidor dev
npm run db:studio             # Abre Prisma Studio (GUI do banco)
npm run db:migrate            # Cria nova migração
npm run docker:logs           # Vê logs do PostgreSQL

# Build
npm run build                 # Build para produção
npm start                     # Inicia servidor prod

# Linting
npm run lint                  # Verifica código

# Setup Completo
npm run setup                 # Install + migrate + seed
```

## 📚 Documentação

- [PRD Completo](./PRD_MORPHEUS.md) - Especificações detalhadas de todas as 5 fases
- [Schema Prisma](./prisma/schema.prisma) - Modelos de dados
- [Schemas de Validação](./lib/schemas.ts) - Zod schemas para requisições

## 🐛 Troubleshooting

### Erro: "Cannot find module '@prisma/client'"

```bash
npm run db:generate
```

### PostgreSQL não conecta

```bash
# Verificar se container está rodando
docker-compose ps

# Reiniciar
docker-compose restart postgres

# Visualizar logs
docker-compose logs postgres
```

### Erro de migração

```bash
# Resetar banco (DELETE ALL DATA!)
npx prisma migrate reset

# Ou recriar schema
npx prisma db push
```

## 🔄 CI/CD & Deploy (Futuro)

Planeado para FASE 2:
- GitHub Actions para testes automatizados
- Deploy automático em Vercel (frontend)
- Deploy em Railway ou similar (PostgreSQL)
- Stripe webhooks configurados

## 📊 Roadmap

### FASE 1 ✅ (Atual)
- MVP com funcionalidades core
- Autenticação e multi-tenancy
- Calendário e agendamentos
- Zero conflito de horário

### FASE 2 🔜
- UI/UX Morpheus design system
- FullCalendar melhorado com drag-and-drop
- Notificações via Resend (email) e WhatsApp
- Animações com Framer Motion

### FASE 3
- Billing e faturamento com Stripe
- Invoice geração automática
- Relatórios financeiros

### FASE 4
- Compliance LGPD completo
- Backup e disaster recovery
- Performance scaling

### FASE 5
- Lapidação final
- Documentação técnica
- Marketing e onboarding

## 📧 Contato & Contribuição

Este é um projeto privado de demonstração. Para contribuições ou dúvidas, abra uma issue.

## 📄 Licença

Proprietary © 2026 Morpheus
