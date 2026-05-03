# PRD — Morpheus · Plataforma SaaS de Gestão Clínica

**Versão:** 2.0 — Documento Completo (5 Fases)  
**Data:** 01/05/2026  
**Status:** Aprovado para implementação — Todas as fases detalhadas  
**Projeto substituto de:** `renovopsicologia.com.br` (Lucee/CFML + MySQL + jQuery)  
**Autor do documento:** Engenharia de Produto — Morpheus

---

## Índice

1. [Visão Geral e Identidade](#1-visão-geral-e-identidade)
2. [Mapeamento Micro-Funcional — Do Legado ao Morpheus](#2-mapeamento-micro-funcional--do-legado-ao-morpheus)
3. [Fases de Desenvolvimento](#3-fases-de-desenvolvimento)
   - [FASE 1: MVP — A Fundação](#fase-1-mvp--a-fundação)
   - [FASE 2: Experiência e Modernização](#fase-2-experiência-e-modernização--morpheus-look--feel)
   - [FASE 3: Billing & Advanced Finance](#fase-3-billing--advanced-finance)
   - [FASE 4: Compliance & Scale (LGPD)](#fase-4-compliance--scale-lgpd)
   - [FASE 5: Lapidação](#fase-5-lapidação--o-produto-que-se-defende-sozinho)
4. [Backlog de Dívida Técnica — O que NÃO repetir](#4-backlog-de-dívida-técnica--o-que-não-repetir)
5. [Glossário Morpheus × Legado](#5-glossário-morpheus--legado)

---

## 1. Visão Geral e Identidade

### 1.1 O Produto

**Morpheus** é uma plataforma SaaS B2B de gestão clínica focada em consultórios de psicologia. Ele substitui sistemas legados instalados em servidores Windows com stacks obsoletas por uma aplicação web moderna, multi-tenant, com zero configuração de infraestrutura para o cliente final.

O nome **Morpheus** — deus grego dos sonhos e das formas — reflete a proposta de transformação: dar forma nova a um processo que já existe, sem quebrar o que funciona. O sistema não inventa um fluxo de trabalho; ele o moderniza com precisão cirúrgica.

### 1.2 A Tradução do Legado para o SaaS

O sistema legado (`Renovo Psicologia`) foi construído em **Lucee/CFML + MySQL + jQuery + Bootstrap 3**, rodando em **Windows Server**, com dois aplicativos separados compartilhando um banco de dados. Sua arquitetura reflete as decisões de 2010–2017: framesets HTML 4, senhas em texto puro, charset inconsistente, paths Windows hardcoded e um gateway de boletos que trafega dados bancários via HTTP GET.

O Morpheus não é uma "reescrita". É uma **reinterpretação**. A complexidade acumulada em 36 dívidas técnicas identificadas no legado (detalhadas na Seção 4) se converte em três princípios de design do Morpheus:

| Princípio | Tradução Prática |
|---|---|
| **Zero configuração** | O clínico cria a conta, cadastra as salas e começa a agendar. Sem datasources, sem paths físicos, sem licenças de gateway. |
| **Integridade de dado por design** | CPF é `VARCHAR(11)`, nunca `NUMERIC`. Senhas jamais tocam o banco sem hash. Conflitos de horário são impossíveis na camada de serviço. |
| **Auditoria como cidadã de primeira classe** | Todo evento de dados relevante produz um log estruturado. Não um log comentado — um log ativo. |

### 1.3 Público-Alvo

**Primário:** Recepcionistas e coordenadoras de clínicas de psicologia — profissionais não-técnicos que precisam de uma ferramenta tão simples quanto uma agenda de papel, com a confiabilidade de um sistema enterprise.

**Secundário:** As próprias psicólogas — que no legado acessavam um portal separado (`/agendarenovo`) para gerenciar suas salas. No Morpheus, essa distinção desaparece: há um único produto com papéis diferenciados.

### 1.4 Modelo de Negócio — Assinatura via Stripe

O Morpheus opera no modelo **SaaS por assinatura mensal**, cobrado por organização (tenant). O billing é gerenciado integralmente pelo Stripe.

| Plano (MVP) | Salas | Psicólogos | Preço Sugerido |
|---|---|---|---|
| **Essencial** | Até 3 | Até 5 | R$ 149/mês |
| **Clínica** | Até 10 | Até 20 | R$ 349/mês |
| **Enterprise** | Ilimitado | Ilimitado | Negociado |

> Os planos são configurados como **Products + Prices no Stripe**. O Morpheus não armazena informações de cartão — toda a lógica de cobrança é delegada ao Stripe Customer Portal.

### 1.5 Tech Stack

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | SSR + API Routes no mesmo projeto, elimina BFF separado |
| **Estilização** | Tailwind CSS | Utility-first, sem CSS global instável |
| **ORM** | Prisma + PostgreSQL | Type-safety, migrações versionadas, schema declarativo |
| **Auth** | NextAuth.js v5 (Auth.js) | Provedores OAuth + Credentials, JWT ou database sessions |
| **Billing** | Stripe (Checkout + Customer Portal + Webhooks) | Padrão de mercado para SaaS |
| **Calendário** | FullCalendar (React) com Drag-and-Drop | Substituto direto do calendário legado, sem as limitações |
| **Animações** | Framer Motion | Micro-interações de satisfação ao concluir tarefas |
| **3D/Visualizações** | React Three Fiber + Three.js | Elementos visuais discretos no dashboard (FASE 2) |
| **Notificações** | Resend (e-mail) + Evolution API (WhatsApp) | Substitui o SMS não implementado do legado (FASE 2) |
| **Deploy** | Vercel (frontend) + Railway/Neon (PostgreSQL) | Sem Windows Server, sem WEB-INF, sem Lucee |

---

## 2. Mapeamento Micro-Funcional — Do Legado ao Morpheus

Esta seção descreve, com granularidade de implementação, como cada função do sistema legado é modernizada. Para cada módulo, o estado atual (`Renovo`) é confrontado com a especificação do Morpheus.

---

### 2.1 Autenticação

#### Estado Legado

```
tb_usuarios.usu_co_matricula = "senha123"  ← texto puro
WHERE usu_tx_login = '#form.login#'        ← SQL injection (bug #1)
AND usu_co_matricula = '#form.senha#'      ← SQL injection + texto puro (bug #2)
```

Não há guards por rota. Qualquer URL `controller.cfm?area=X&arquivo=Y` é acessível a qualquer sessão autenticada. Troca de senha não exige senha atual (bug #10). Cookies sem `HttpOnly`/`Secure` (bug #9).

#### Implementação Morpheus

**Provedor:** NextAuth.js v5 com o adapter `@auth/prisma-adapter`.

**Estratégia de sessão:** JWT com refresh token rotativo (stateless, sem `tb_log` de sessão no hot path).

**Hash de senha:** `bcrypt` com cost factor 12 (via `bcryptjs`). Jamais armazenado o plaintext.

**Schema Prisma — Auth:**

```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified DateTime?
  passwordHash  String?   // null para usuários OAuth
  role          UserRole  @default(RECEPTIONIST)
  tenantId      String
  tenant        Tenant    @relation(fields: [tenantId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  active        Boolean   @default(true)

  // Restrições de visibilidade (equivalente às tabelas N:N do legado)
  visibleRooms        Room[]         @relation("UserRoomVisibility")
  visiblePsychologists Psychologist[] @relation("UserPsychologistVisibility")
}

enum UserRole {
  SUPER_ADMIN   // invisível para outros (regra do grupo 1 do legado)
  ADMIN
  RECEPTIONIST
  PSYCHOLOGIST  // novo: psicólogas têm login próprio
}
```

**Middleware de autorização (Next.js):**

```typescript
// middleware.ts — substitui o "não há guards por rota" do legado
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/api/protected/:path*"],
};
```

**Lógica de troca de senha:**

```typescript
// Corrige bug #10: exige senha atual, política de força, hash obrigatório
async function changePassword(userId: string, currentPw: string, newPw: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const isValid = await bcrypt.compare(currentPw, user.passwordHash!);
  if (!isValid) throw new AuthError("Senha atual incorreta");
  if (newPw.length < 8) throw new ValidationError("Mínimo 8 caracteres");
  const hash = await bcrypt.hash(newPw, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
}
```

**Diferenças chave do legado:**

| Legado | Morpheus |
|---|---|
| Senha em `usu_co_matricula` (texto puro) | `passwordHash` com bcrypt cost 12 |
| SQL injection no login | Prisma parametrizado — injeção impossível por design |
| Sem guards por rota | Middleware NextAuth em todas as rotas `/dashboard/*` |
| Cookies sem flags | NextAuth configura `HttpOnly`, `Secure`, `SameSite=Lax` por padrão |
| Troca de senha sem verificação | Exige senha atual + política de força |
| Dois sistemas de login (admin + portal) | Um único sistema de auth com `UserRole` |

---

### 2.2 Controle de Salas (Core)

#### Estado Legado

O portal `/agendarenovo` usa FullCalendar (versão antiga) com jQuery. O endpoint AJAX `ajax_load_events.cfm` recebe timestamps Java Long. O formulário de agendamento `agendar_horario.cfm` exibe `08:00, 08:15, 08:30...` mas envia `value="#i#:00"` — granularidade real de **1 hora** (bug #16).

A anti-duplicata (`eventos.cfc/InsertEvento`) verifica apenas choque **exato** de `hora_ini + hora_fim` — uma reserva 09:00–10:00 e outra 09:30–10:30 **coexistem** (bug #15). Sessões de 50 minutos (padrão APA) são rejeitadas porque o sistema exige exatamente 60 minutos (bug #19).

#### Implementação Morpheus

**Componente:** `FullCalendar React` com plugin `timeGrid` e `interaction` (drag-and-drop).

**Schema Prisma — Salas:**

```prisma
model Room {
  id          String    @id @default(cuid())
  name        String
  color       String    @default("#6366f1") // cor no calendário
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  active      Boolean   @default(true)
  bookings    RoomBooking[]
  visibleTo   User[]    @relation("UserRoomVisibility")
}

model RoomBooking {
  id          String    @id @default(cuid())
  roomId      String
  room        Room      @relation(fields: [roomId], references: [id])
  userId      String    // quem criou
  title       String
  description String?
  startsAt    DateTime  // UTC — sem campos hora/data separados
  endsAt      DateTime  // UTC
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([roomId, startsAt, endsAt]) // índice para query de conflito
}
```

**Detalhes de implementação críticos:**

1. **`startsAt` e `endsAt` são `DateTime` UTC unificados** — o legado separava `data`, `hora_ini`, `hora_fim` em colunas distintas, o que obrigava concatenação manual e era fonte de erros de timezone.

2. **Detecção de sobreposição** — corrige o bug #15 com query de intervalos corretos:

```typescript
// services/roomBooking.service.ts
async function checkConflict(
  roomId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string
): Promise<RoomBooking | null> {
  return prisma.roomBooking.findFirst({
    where: {
      roomId,
      active: true,
      id: { not: excludeId },
      // Detecta QUALQUER sobreposição, não só choque exato (bug #15)
      AND: [
        { startsAt: { lt: endsAt } },    // o evento existente começa ANTES do fim do novo
        { endsAt: { gt: startsAt } },    // o evento existente termina DEPOIS do início do novo
      ],
    },
    include: { user: { select: { name: true } } },
  });
}

async function createBooking(data: CreateBookingInput): Promise<RoomBooking> {
  const conflict = await checkConflict(data.roomId, data.startsAt, data.endsAt);
  if (conflict) {
    throw new ConflictError(
      `Sala já reservada por ${conflict.user.name} neste horário.`
    );
  }
  return prisma.roomBooking.create({ data });
}
```

3. **Granularidade de 15 minutos** — o calendário é configurado com `slotDuration="00:15:00"` e `snapDuration="00:15:00"`. O form de criação manual usa um time picker com step de 15 min. Corrige o bug #16.

4. **Sem restrição de duração fixa** — qualquer duração ≥ 15 minutos é válida. Corrige o bug #19 (sessões de 50min agora funcionam).

5. **API Route de eventos:**

```typescript
// app/api/rooms/[roomId]/bookings/route.ts
export async function GET(req: Request, { params }: { params: { roomId: string } }) {
  const { searchParams } = new URL(req.url);
  const start = new Date(searchParams.get("start")!);
  const end = new Date(searchParams.get("end")!);
  
  const bookings = await prisma.roomBooking.findMany({
    where: {
      roomId: params.roomId,
      active: true,
      startsAt: { gte: start },
      endsAt: { lte: end },
    },
    include: { user: { select: { name: true } } },
  });

  // Formato FullCalendar — sem timestamps Java Long (legado)
  return Response.json(
    bookings.map((b) => ({
      id: b.id,
      title: b.title,
      start: b.startsAt.toISOString(),
      end: b.endsAt.toISOString(),
      extendedProps: { description: b.description, createdBy: b.user.name },
    }))
  );
}
```

**Diferenças chave do legado:**

| Legado | Morpheus |
|---|---|
| Anti-duplicata por choque exato (bug #15) | Query de sobreposição de intervalo (Allen's Interval) |
| Granularidade de 1 hora no form (bug #16) | Time picker + FullCalendar com step 15 minutos |
| Duração fixa de 60 min (bug #19) | Qualquer duração ≥ 15 minutos |
| Timestamps Java Long no AJAX | ISO 8601 UTC nativo |
| `data` + `hora_ini` + `hora_fim` separados | `startsAt DateTime` + `endsAt DateTime` unificados |
| Versionamento por cópia de arquivo (bug #22) | Git, zero cópias de CFC |

---

### 2.3 Gestão de Psicólogos e Clientes

#### Estado Legado

**Psicólogos:** CFC `pscicologa/cadastro.cfc` com typo no path (`pscicologa` em vez de `psicologa`). O `f_update` usa `UPDATE renovopsicologia.tb_psicologas` — schema hardcoded no SQL (bug #21). Relação 1:N: um cliente pertence a uma única psicóloga (`idPsicologa` FK direta em `tb_clientes`).

**CPF:** Armazenado como `cf_sql_numeric` — zeros à esquerda são truncados. CPF `012.345.678-90` vira `12345678-90` (bug #12).

**Busca por nome em clientes:** Filtro usa `p_id%` (bug #13) — busca por ID numérico em vez de nome. O campo de busca por nome nunca funcionou corretamente.

#### Implementação Morpheus

**Schema Prisma — Entidades Clínicas:**

```prisma
model Psychologist {
  id          String    @id @default(cuid())
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  userId      String?   @unique  // null se psicóloga sem login no sistema
  user        User?     @relation(fields: [userId], references: [id])
  name        String
  cpf         String?   @db.Char(11) // SEMPRE VARCHAR — zeros preservados (corrige bug #12)
  birthDate   DateTime?
  email       String?
  phone       String?
  crp         String?   // Conselho Regional de Psicologia
  address     Json?     // { street, number, complement, district, city, state, zip }
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  clients     Client[]
  schedules   PsychologistSchedule[]
  appointments Appointment[]
  visibleTo   User[]    @relation("UserPsychologistVisibility")

  @@unique([tenantId, cpf]) // CPF único por tenant, não global
}

model Client {
  id              String    @id @default(cuid())
  tenantId        String
  tenant          Tenant    @relation(fields: [tenantId], references: [id])
  psychologistId  String
  psychologist    Psychologist @relation(fields: [psychologistId], references: [id])
  name            String
  cpf             String?   @db.Char(11) // VARCHAR — corrige bug #12
  birthDate       DateTime?
  email           String?
  phone           String?
  address         Json?
  // LGPD: flags de consentimento (corrige gap #31)
  consentSms      Boolean   @default(false)
  consentEmail    Boolean   @default(false)
  consentWhatsapp Boolean   @default(false)
  personType      String    @default("PF") // PF ou PJ
  active          Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  appointments    Appointment[]
}
```

**Validação e formatação de CPF:**

```typescript
// lib/validators/cpf.ts
export function sanitizeCpf(raw: string): string {
  // Remove máscara, preserva zeros à esquerda — corrige bug #12
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) throw new ValidationError("CPF deve ter 11 dígitos");
  if (!isValidCpf(digits)) throw new ValidationError("CPF inválido");
  return digits; // armazena sempre como 11 chars sem máscara
}

export function formatCpf(digits: string): string {
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
```

**Busca de clientes — corrige bug #13:**

```typescript
// Legado: WHERE cpf LIKE 'p_id%'  ← busca pelo id numérico, não pelo nome
// Morpheus:
async function searchClients(tenantId: string, query: string) {
  return prisma.client.findMany({
    where: {
      tenantId,
      active: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } }, // busca real por nome
        { cpf: { contains: query.replace(/\D/g, "") } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    include: { psychologist: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
}
```

**Escala semanal de psicólogos:**

```prisma
model PsychologistSchedule {
  id              String       @id @default(cuid())
  psychologistId  String
  psychologist    Psychologist @relation(fields: [psychologistId], references: [id])
  dayOfWeek       Int          // 0=Dom, 1=Seg ... 6=Sáb (ISO, não o valor legado)
  startTime       String       @db.VarChar(5) // "HH:MM" — sem Date para evitar timezone hell
  endTime         String       @db.VarChar(5)
}
```

> **Nota de implementação:** `startTime`/`endTime` como `String "HH:MM"` é intencional. Guardar horários de recorrência semanal como `Time` ou `DateTime` gera problemas de timezone quando o servidor ou o banco mudam de fuso. A lógica de validação opera sobre strings comparáveis.

**Diferenças chave do legado:**

| Legado | Morpheus |
|---|---|
| CPF como `cf_sql_numeric` (bug #12) | `String @db.Char(11)` — zeros sempre preservados |
| Busca por nome usa `p_id%` (bug #13) | Full-text search por nome, CPF e e-mail |
| Schema hardcoded `renovopsicologia.tb_psicologas` (bug #21) | Prisma sem schema no SQL — portável por design |
| Typo `pscicologa` no path (infraestrutura) | Nomenclatura padronizada em inglês |
| Consent: só `aceita_receber_sms` | Flags LGPD granulares: `consentSms`, `consentEmail`, `consentWhatsapp` |

---

### 2.4 Módulo Financeiro

#### Estado Legado

O fluxo de cobrança depende de um gateway externo (`nacsolution.com.br`) acionado via HTTP GET com dados bancários, CPF, agência e licença na query string (bug #5). O e-mail de boleto tem `subject="teste"` em produção (bug #17). Não há PIX. Não há link de pagamento.

O gateway NAC gera um HTML que é salvo em disco (path Windows hardcoded: `D:\www\Clientes\...`) e então convertido para PDF via `<cfdocument>` com URLs de imagens apontando para CDN externo via HTTP (bug #20). Dados sensíveis trafegam em texto puro na URL (bug #5).

#### Implementação Morpheus — Stripe

O Morpheus substitui toda a infraestrutura de boletos pela pilha Stripe, introduzida na FASE 3. Na FASE 1, o módulo financeiro existe apenas como **registro de sessões/consultas** (valor, status, pagamento pendente). A emissão de cobranças é FASE 3.

**Schema Prisma — Financeiro (FASE 1: estrutura base):**

```prisma
model Appointment {
  id               String      @id @default(cuid())
  tenantId         String
  tenant           Tenant      @relation(fields: [tenantId], references: [id])
  clientId         String
  client           Client      @relation(fields: [clientId], references: [id])
  psychologistId   String
  psychologist     Psychologist @relation(fields: [psychologistId], references: [id])
  startsAt         DateTime
  endsAt           DateTime
  value            Decimal     @db.Decimal(10, 2)
  status           AppointmentStatus @default(SCHEDULED)
  paymentStatus    PaymentStatus     @default(PENDING)
  // FASE 3: stripeInvoiceId String?
  active           Boolean     @default(true)
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  auditLogs        AuditLog[]
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  NO_SHOW    // equivalente ao status 2 = "Falta" do legado
  CANCELLED  // equivalente ao status 3 = "Cancelada" do legado
}

enum PaymentStatus {
  PENDING
  INVOICED   // FASE 3: boleto/invoice gerada no Stripe
  PAID
  OVERDUE
}
```

**Diferenças chave do legado (completo na FASE 3):**

| Legado | Morpheus |
|---|---|
| Gateway NAC via HTTP GET com dados na URL (bug #5) | Stripe SDK server-side com HTTPS + webhook signature |
| Boleto salvo em disco Windows (bug #20) | Stripe Invoice PDF gerado e hosteado pelo Stripe |
| `subject="teste"` em produção (bug #17) | Templates de e-mail gerenciados via Resend |
| Sem PIX | Stripe suporta PIX nativo no Brasil |
| Dados bancários por psicóloga no banco (sem criptografia) | Stripe Connect — dados bancários NUNCA tocam o banco do Morpheus |

---

## 3. Fases de Desenvolvimento

---

### FASE 1: MVP — A Fundação

**Objetivo:** Colocar em produção um sistema funcional que substitua as capacidades centrais do legado com segurança e integridade de dados. Nenhuma funcionalidade nova — apenas o legado, feito certo.

**Critério de conclusão da fase:** Uma clínica consegue se cadastrar, criar salas, cadastrar psicólogas e clientes, e agendar consultas sem conflito de horário — tudo sem instrução técnica.

---

#### 1.1 Setup de Infraestrutura e Multi-tenancy

**Multi-tenancy por linha de banco de dados (Row-Level Multi-tenancy):**

O Morpheus adota **schema compartilhado com `tenantId` em todas as tabelas**, oposto ao schema-per-tenant. Esta decisão prioriza simplicidade operacional e custo (um único banco PostgreSQL serve N clínicas).

**Schema Prisma — Tenant:**

```prisma
model Tenant {
  id          String    @id @default(cuid())
  name        String                         // "Clínica Renovo Psicologia"
  slug        String    @unique              // "renovo" → renovo.morpheus.app
  plan        Plan      @default(ESSENTIAL)
  planExpiresAt DateTime?
  // FASE 3: stripeCustomerId String? @unique
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  users       User[]
  rooms       Room[]
  psychologists Psychologist[]
  clients     Client[]
  appointments Appointment[]
  auditLogs   AuditLog[]
}

enum Plan {
  ESSENTIAL
  CLINIC
  ENTERPRISE
  TRIAL
}
```

**Isolamento de dados — camada de serviço:**

```typescript
// lib/context/tenant.ts
// Cada request autenticado carrega o tenantId do JWT
// TODAS as queries de dados passam por este contexto

export async function getServerTenantId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new UnauthorizedError();
  return session.user.tenantId;
}

// Padrão obrigatório em todos os services:
// ❌ prisma.client.findMany()  — vaza dados cross-tenant
// ✅ prisma.client.findMany({ where: { tenantId } })
```

**Enforcement via Prisma Middleware (defense in depth):**

```typescript
// lib/prisma.ts
const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        // Garante que tenantId sempre está presente em queries de leitura
        if (!args.where?.tenantId && process.env.NODE_ENV === "production") {
          console.error("[SECURITY] findMany without tenantId filter:", args);
          // Em produção: bloqueia. Em desenvolvimento: loga e permite.
        }
        return query(args);
      },
    },
  },
});
```

**Estrutura de rotas Next.js — por tenant:**

```
app/
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
├── (dashboard)/
│   ├── layout.tsx              ← verifica sessão + carrega tenant
│   ├── page.tsx                ← dashboard home
│   ├── rooms/
│   │   ├── page.tsx            ← lista de salas
│   │   └── [roomId]/
│   │       └── page.tsx        ← calendário da sala
│   ├── psychologists/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── clients/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── appointments/
│       └── page.tsx
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── rooms/[roomId]/bookings/route.ts
│   ├── psychologists/route.ts
│   ├── clients/route.ts
│   └── appointments/route.ts
└── middleware.ts               ← protege todo /dashboard e /api (exceto /api/auth)
```

---

#### 1.2 Autenticação Segura

*(Detalhada na Seção 2.1 — Implementação Morpheus)*

**Checklist de implementação FASE 1:**

- [ ] Instalar `next-auth@5`, `@auth/prisma-adapter`, `bcryptjs`
- [ ] Configurar `authOptions` com Credentials Provider (email + senha)
- [ ] Adicionar migration Prisma para tabelas NextAuth (`Account`, `Session`, `VerificationToken`)
- [ ] Implementar `middleware.ts` protegendo `/dashboard` e `/api` (exceto `/api/auth`)
- [ ] Tela de login com validação client-side (Zod + React Hook Form)
- [ ] Tela de troca de senha com exigência de senha atual
- [ ] Fluxo de reset de senha via e-mail (token com expiração de 1h)
- [ ] Seed de superadmin por tenant criado no onboarding

---

#### 1.3 Dashboard Básico de Controle de Salas

**Componentes da tela de salas:**

```
/dashboard/rooms
├── RoomSelector (sidebar ou tabs)    ← lista de salas do tenant
├── RoomCalendar                      ← FullCalendar timeGridWeek
│   ├── BookingPopover                ← clique em slot vazio → form de reserva
│   ├── BookingCard                   ← evento existente → ver/editar/deletar
│   └── DragToReschedule              ← drag-and-drop para mover reserva
└── RoomQuickStats                    ← taxa de ocupação da semana (texto simples na FASE 1)
```

**FullCalendar — configuração crítica:**

```typescript
// components/RoomCalendar.tsx
<FullCalendar
  plugins={[timeGridPlugin, interactionPlugin]}
  initialView="timeGridWeek"
  slotDuration="00:15:00"        // granularidade 15 min — corrige bug #16
  snapDuration="00:15:00"
  slotMinTime="07:00:00"
  slotMaxTime="22:00:00"
  editable={true}                // habilita drag-and-drop
  selectable={true}              // habilita clique em slot vazio
  selectMirror={true}
  nowIndicator={true}
  locale={ptBrLocale}
  events={fetchEvents}           // função async que chama /api/rooms/[id]/bookings
  eventDrop={handleEventDrop}    // PATCH na API com nova hora
  select={handleSelect}          // abre modal de criação
  eventClick={handleEventClick}  // abre popover de detalhes
/>
```

**Fluxo de criação de reserva (sem conflito):**

```
1. Usuário arrasta ou clica em slot → Modal de criação
2. Form: título (obrigatório), descrição (opcional), horário (pré-preenchido)
3. Submit → POST /api/rooms/[roomId]/bookings
4. API: verifica sessão → verifica tenantId → checkConflict() → create()
5a. Sucesso → resposta 201 → FullCalendar atualiza via refetchEvents()
    + Framer Motion: animação de "check" no card do evento (FASE 2)
5b. Conflito → resposta 409 → Toast de erro com nome de quem reservou
```

**Gestão de salas (CRUD admin):**

```typescript
// Apenas ADMINs podem criar/editar/desativar salas
// RECEPTIONISTs e PSYCHOLOGISTs só agendam

model Room {
  // ...
  color String @default("#6366f1") // cor exibida no calendário, editável pelo admin
}
```

---

#### 1.4 Cadastro de Psicólogos

**Formulário de cadastro (`/dashboard/psychologists/new`):**

| Campo | Tipo | Validação |
|---|---|---|
| Nome completo | text | obrigatório, 2–100 chars |
| CRP | text | formato `XX/XXXXX` |
| CPF | text | 11 dígitos, algoritmo de validação, armazenado sem máscara |
| Data de nascimento | date | opcional |
| E-mail | email | único por tenant |
| Telefone / Celular | tel | formato brasileiro |
| Endereço | campos estruturados | CEP com auto-complete via ViaCEP API |

**Escala semanal (inline no cadastro):**

```typescript
// Substituindo a tela separada do legado (pscicologa/escala/)
// O formulário de psicóloga inclui uma seção de escala semanal

type ScheduleEntry = {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Dom ... 6=Sáb (ISO)
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
};

// Interface: checkboxes dos dias da semana + time pickers por dia
// Ex: ☑ Segunda 08:00 – 18:00 | ☑ Quarta 09:00 – 17:00
```

**Associação usuário–psicóloga:**

```typescript
// Se a psicóloga tem login no sistema, ela é associada a um User com role PSYCHOLOGIST
// A associação é feita via Psychologist.userId
// Isso elimina as duas tabelas N:N do legado (tb_usuarios_x_psicologas) de forma mais limpa
```

**API Routes:**

```typescript
// GET  /api/psychologists         → lista (filtrada por tenantId + visibilidade do usuário)
// POST /api/psychologists         → cria nova psicóloga
// GET  /api/psychologists/[id]    → detalhe
// PATCH /api/psychologists/[id]   → atualiza
// DELETE /api/psychologists/[id]  → soft-delete (active = false)
// GET  /api/psychologists/[id]/schedule → escala semanal
// PUT  /api/psychologists/[id]/schedule → substitui escala completa
```

---

#### 1.5 Cadastro de Clientes

**Formulário de cadastro (`/dashboard/clients/new`):**

| Campo | Tipo | Observação |
|---|---|---|
| Psicóloga responsável | select | obrigatório — mantém relação 1:N do legado |
| Nome completo | text | obrigatório |
| CPF | text | `Char(11)` — zeros preservados (corrige bug #12) |
| Data de nascimento | date | opcional |
| E-mail | email | opcional |
| Telefone / Celular | tel | |
| Endereço | estruturado | auto-complete CEP |
| Consentimentos | checkboxes | SMS, E-mail, WhatsApp — LGPD granular (corrige gap #31) |

**Validação de CPF na camada de API:**

```typescript
// app/api/clients/route.ts
const schema = z.object({
  psychologistId: z.string().cuid(),
  name: z.string().min(2).max(100),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos numéricos").optional(),
  // ...
});

export async function POST(req: Request) {
  const tenantId = await getServerTenantId();
  const body = schema.parse(await req.json());
  
  // CPF: valida algoritmo + verifica unicidade por tenant
  if (body.cpf) {
    const existing = await prisma.client.findFirst({
      where: { tenantId, cpf: body.cpf, active: true },
    });
    if (existing) return Response.json({ error: "CPF já cadastrado" }, { status: 409 });
  }
  
  const client = await prisma.client.create({
    data: { ...body, tenantId },
  });
  return Response.json(client, { status: 201 });
}
```

---

#### 1.6 Módulo de Consultas (Agendamento de Sessão)

**Diferença conceitual importante:** O legado mistura dois conceitos no mesmo fluxo — reserva de sala e consulta clínica. O Morpheus os separa intencionalmente:

- **`RoomBooking`** — quando e qual sala está sendo usada.
- **`Appointment`** — a consulta clínica entre psicóloga e cliente, com valor e status financeiro.

Na FASE 1, as consultas podem existir sem `RoomBooking` associado (agendamento de sessão sem ocupação física de sala) e vice-versa. A integração entre os dois é uma feature opcional da FASE 2.

**Fluxo de agendamento de consulta:**

```
1. /dashboard/appointments/new
2. Selecionar psicóloga → filtra clientes daquela psicóloga
3. Selecionar cliente
4. Selecionar data e horário (date picker + time picker 15 min)
5. Informar valor da sessão
6. Validações:
   a. Horário dentro da escala da psicóloga? (corrige bug #14 — f_set_sessao_planejada incompleta)
   b. Psicóloga não tem outra consulta no mesmo horário? (sobreposição de intervalo)
7. Criar Appointment com status SCHEDULED + paymentStatus PENDING
```

**Serviço de agendamento:**

```typescript
// services/appointment.service.ts
async function scheduleAppointment(input: CreateAppointmentInput) {
  const { psychologistId, clientId, startsAt, endsAt, value, tenantId } = input;

  // 1. Valida escala da psicóloga
  const dayOfWeek = startsAt.getDay();
  const startTime = formatTime(startsAt); // "HH:MM"
  const endTime = formatTime(endsAt);

  const validSchedule = await prisma.psychologistSchedule.findFirst({
    where: {
      psychologistId,
      dayOfWeek,
      startTime: { lte: startTime },
      endTime: { gte: endTime },
    },
  });

  if (!validSchedule) {
    throw new ValidationError("Horário fora da escala da psicóloga.");
  }

  // 2. Verifica conflito com outras consultas da mesma psicóloga
  const conflict = await prisma.appointment.findFirst({
    where: {
      psychologistId,
      active: true,
      status: { notIn: ["CANCELLED"] },
      AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
    },
    include: { client: { select: { name: true } } },
  });

  if (conflict) {
    throw new ConflictError(
      `Psicóloga já tem consulta com ${conflict.client.name} neste horário.`
    );
  }

  // 3. Cria a consulta
  return prisma.appointment.create({
    data: { psychologistId, clientId, tenantId, startsAt, endsAt, value, status: "SCHEDULED" },
  });
}
```

---

#### 1.7 Auditoria

O legado tem `tb_log` com código de captura de queries comentado (bug #34). O Morpheus implementa logs de auditoria ativos desde o início.

**Schema:**

```prisma
model AuditLog {
  id          String    @id @default(cuid())
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  userId      String?
  action      AuditAction
  entity      String    // "Client", "Appointment", "RoomBooking", etc.
  entityId    String
  metadata    Json?     // diff de campos alterados
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime  @default(now())

  @@index([tenantId, entity, entityId])
  @@index([tenantId, createdAt])
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE   // soft-delete
  VIEW     // acesso a dado pessoal — requisito LGPD Art. 37
  LOGIN
  LOGOUT
  PASSWORD_CHANGE
}
```

**Middleware de auditoria:**

```typescript
// lib/audit.ts
export async function audit(params: {
  tenantId: string;
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  metadata?: object;
  request?: Request;
}) {
  await prisma.auditLog.create({
    data: {
      ...params,
      metadata: params.metadata ? params.metadata : undefined,
      ipAddress: params.request ? getIp(params.request) : undefined,
    },
  });
}
```

---

#### 1.8 Onboarding de Tenant

O legado não tem onboarding — a configuração era feita direto no banco e nos arquivos de configuração do servidor. O Morpheus tem um fluxo de auto-serviço.

**Fluxo:**

```
/register
1. Nome da clínica → gera slug único
2. Nome do administrador + e-mail + senha
3. Confirmação de e-mail (token JWT, expira 24h)
4. Criação do Tenant + User (role ADMIN)
5. Redirecionamento para /dashboard/onboarding
   ├── Passo 1: Criar primeira sala
   ├── Passo 2: Criar primeira psicóloga
   └── Passo 3: Tour interativo do calendário
```

---

#### 1.9 Schema Prisma Completo da FASE 1

```prisma
// schema.prisma — FASE 1

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════
// MULTI-TENANCY
// ═══════════════════════════════════════════

model Tenant {
  id              String          @id @default(cuid())
  name            String
  slug            String          @unique
  plan            Plan            @default(TRIAL)
  planExpiresAt   DateTime?
  active          Boolean         @default(true)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  users           User[]
  rooms           Room[]
  psychologists   Psychologist[]
  clients         Client[]
  appointments    Appointment[]
  auditLogs       AuditLog[]
}

enum Plan { TRIAL ESSENTIAL CLINIC ENTERPRISE }

// ═══════════════════════════════════════════
// AUTH (NextAuth.js v5 compatible)
// ═══════════════════════════════════════════

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified DateTime?
  passwordHash  String?
  role          UserRole  @default(RECEPTIONIST)
  tenantId      String
  tenant        Tenant    @relation(fields: [tenantId], references: [id])
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // NextAuth relations
  accounts      Account[]
  sessions      Session[]

  // Restrições de visibilidade
  visibleRooms         Room[]          @relation("UserRoomVisibility")
  visiblePsychologists Psychologist[]  @relation("UserPsychologistVisibility")

  // Psicóloga associada (se role = PSYCHOLOGIST)
  psychologist  Psychologist? @relation("UserPsychologist")
}

enum UserRole { SUPER_ADMIN ADMIN RECEPTIONIST PSYCHOLOGIST }

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ═══════════════════════════════════════════
// CORE CLÍNICO
// ═══════════════════════════════════════════

model Psychologist {
  id          String    @id @default(cuid())
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  userId      String?   @unique
  user        User?     @relation("UserPsychologist", fields: [userId], references: [id])
  name        String
  cpf         String?   @db.Char(11)
  birthDate   DateTime?
  email       String?
  phone       String?
  crp         String?
  address     Json?
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  clients      Client[]
  schedules    PsychologistSchedule[]
  appointments Appointment[]
  visibleTo    User[]    @relation("UserPsychologistVisibility")

  @@unique([tenantId, cpf])
}

model PsychologistSchedule {
  id              String       @id @default(cuid())
  psychologistId  String
  psychologist    Psychologist @relation(fields: [psychologistId], references: [id])
  dayOfWeek       Int          // 0=Dom ... 6=Sáb
  startTime       String       @db.VarChar(5) // "HH:MM"
  endTime         String       @db.VarChar(5)
}

model Client {
  id              String       @id @default(cuid())
  tenantId        String
  tenant          Tenant       @relation(fields: [tenantId], references: [id])
  psychologistId  String
  psychologist    Psychologist @relation(fields: [psychologistId], references: [id])
  name            String
  cpf             String?      @db.Char(11)
  birthDate       DateTime?
  email           String?
  phone           String?
  address         Json?
  personType      String       @default("PF")
  consentSms      Boolean      @default(false)
  consentEmail    Boolean      @default(false)
  consentWhatsapp Boolean      @default(false)
  active          Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  appointments    Appointment[]

  @@unique([tenantId, cpf])
}

// ═══════════════════════════════════════════
// SALAS
// ═══════════════════════════════════════════

model Room {
  id          String        @id @default(cuid())
  tenantId    String
  tenant      Tenant        @relation(fields: [tenantId], references: [id])
  name        String
  color       String        @default("#6366f1")
  active      Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  bookings    RoomBooking[]
  visibleTo   User[]        @relation("UserRoomVisibility")
}

model RoomBooking {
  id          String    @id @default(cuid())
  roomId      String
  room        Room      @relation(fields: [roomId], references: [id])
  userId      String
  title       String
  description String?
  startsAt    DateTime
  endsAt      DateTime
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([roomId, startsAt, endsAt])
}

// ═══════════════════════════════════════════
// CONSULTAS / FINANCEIRO
// ═══════════════════════════════════════════

model Appointment {
  id               String            @id @default(cuid())
  tenantId         String
  tenant           Tenant            @relation(fields: [tenantId], references: [id])
  clientId         String
  client           Client            @relation(fields: [clientId], references: [id])
  psychologistId   String
  psychologist     Psychologist      @relation(fields: [psychologistId], references: [id])
  startsAt         DateTime
  endsAt           DateTime
  value            Decimal           @db.Decimal(10, 2)
  status           AppointmentStatus @default(SCHEDULED)
  paymentStatus    PaymentStatus     @default(PENDING)
  notes            String?
  active           Boolean           @default(true)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@index([tenantId, psychologistId, startsAt])
  @@index([tenantId, clientId])
}

enum AppointmentStatus { SCHEDULED COMPLETED NO_SHOW CANCELLED }
enum PaymentStatus     { PENDING INVOICED PAID OVERDUE }

// ═══════════════════════════════════════════
// AUDITORIA
// ═══════════════════════════════════════════

model AuditLog {
  id          String      @id @default(cuid())
  tenantId    String
  tenant      Tenant      @relation(fields: [tenantId], references: [id])
  userId      String?
  action      AuditAction
  entity      String
  entityId    String
  metadata    Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime    @default(now())

  @@index([tenantId, entity, entityId])
  @@index([tenantId, createdAt])
}

enum AuditAction {
  CREATE UPDATE DELETE VIEW LOGIN LOGOUT PASSWORD_CHANGE
}
```

---

#### 1.10 Checklist Completo da FASE 1

**Infraestrutura:**
- [ ] Repositório Git com branch strategy (`main`, `develop`, `feat/*`)
- [ ] PostgreSQL provisionado (Railway/Neon)
- [ ] Variáveis de ambiente configuradas (`.env.example` documentado)
- [ ] Prisma migrations rodando em CI/CD
- [ ] Deploy automático via Vercel (preview + production)
- [ ] Domínio configurado com HTTPS (Vercel provê por padrão)

**Auth:**
- [ ] NextAuth.js v5 com Credentials Provider
- [ ] Bcrypt no hash de senha
- [ ] Middleware protegendo rotas `/dashboard` e `/api`
- [ ] Fluxo de reset de senha por e-mail
- [ ] Tela de troca de senha com validação de senha atual

**Multi-tenancy:**
- [ ] Tenant isolado por `tenantId` em todas as tabelas
- [ ] `getServerTenantId()` obrigatório em todos os Server Actions e API Routes
- [ ] Onboarding flow com criação de tenant + admin

**Salas:**
- [ ] CRUD de salas (admin only)
- [ ] Calendário FullCalendar com `slotDuration: 15min`
- [ ] Criação de reserva via clique/drag
- [ ] Detecção de sobreposição (não apenas choque exato)
- [ ] Exibição do nome de quem reservou em conflitos

**Psicólogos:**
- [ ] CRUD de psicólogos com validação de CPF (Char, zeros preservados)
- [ ] Gestão de escala semanal inline
- [ ] Associação opcional com `User` (login próprio)

**Clientes:**
- [ ] CRUD de clientes com validação de CPF
- [ ] Busca por nome, CPF e e-mail (corrige bug #13)
- [ ] Flags de consentimento LGPD granulares

**Consultas:**
- [ ] Agendamento com validação de escala da psicóloga
- [ ] Detecção de conflito entre consultas da mesma psicóloga
- [ ] Sem restrição de 60 minutos
- [ ] Status de consulta e status financeiro separados

**Auditoria:**
- [ ] `AuditLog` criado em CREATE/UPDATE/DELETE de todas as entidades sensíveis
- [ ] Log de LOGIN/LOGOUT
- [ ] Log de VIEW em acesso a dados de clientes (LGPD)

---

## FASE 2: Experiência e Modernização — Morpheus Look & Feel

**Objetivo:** Transformar o sistema funcional da FASE 1 em um produto com identidade visual coesa, micro-interações que comunicam estado de forma intuitiva, e um sistema de notificações que o legado prometeu (via SMS) mas nunca entregou.

**Critério de conclusão:** Um usuário não-técnico consegue usar o sistema por uma semana completa sem precisar reler qualquer instrução. O produto "se explica".

**Dependência:** FASE 1 em produção e estável.

---

### 2.1 UI System — Design Tokens e Biblioteca de Componentes

**Princípio:** Antes de qualquer animação ou 3D, o sistema precisa de uma linguagem visual consistente. Todos os componentes de FASE 1 serão refatorados para usar este sistema.

**Design Tokens em `tailwind.config.ts`:**

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe",
          400: "#818cf8", 500: "#6366f1",
          600: "#4f46e5", 700: "#4338ca", 900: "#312e81",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          raised: "hsl(var(--surface-raised))",
          overlay: "hsl(var(--surface-overlay))",
        },
        ink: {
          DEFAULT: "hsl(var(--ink))",
          muted: "hsl(var(--ink-muted))",
          faint: "hsl(var(--ink-faint))",
        },
        status: {
          scheduled: "#6366f1", completed: "#10b981",
          noshow: "#f59e0b", cancelled: "#6b7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderRadius: { card: "0.75rem", pill: "9999px" },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.10)",
        "input-focus": "0 0 0 3px rgb(99 102 241 / 0.2)",
      },
    },
  },
};
export default config;
```

**CSS Variables (globals.css):**

```css
:root {
  --surface: 0 0% 100%;
  --surface-raised: 0 0% 98%;
  --surface-overlay: 0 0% 96%;
  --ink: 224 71% 4%;
  --ink-muted: 220 9% 46%;
  --ink-faint: 220 14% 75%;
}
.dark {
  --surface: 222 47% 6%;
  --surface-raised: 222 47% 9%;
  --surface-overlay: 222 47% 12%;
  --ink: 210 40% 98%;
  --ink-muted: 215 20% 65%;
  --ink-faint: 215 15% 35%;
}
```

**Biblioteca de Componentes (`components/ui/`):**

```
button.tsx      → variantes: primary, secondary, ghost, danger
input.tsx       → label flutuante + estado de erro animado
select.tsx      → wrapper Radix UI Select + tokens
date-picker.tsx → DayPicker + time picker step 15min
modal.tsx       → Radix Dialog + AnimatePresence
toast.tsx       → Sonner com dark mode
badge.tsx       → status semântico com cor por enum
skeleton.tsx    → pulse animado para loading states
card.tsx        → surface-raised com shadow-card
avatar.tsx      → iniciais com cor derivada do nome
empty-state.tsx → estado vazio com ilustração SVG inline
```

**Dark/Light Mode:**

```typescript
// app/layout.tsx
import { ThemeProvider } from "next-themes";
export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

### 2.2 Framer Motion — Sistema de Animações

**Filosofia:** Animações de satisfação, não de entretenimento. Cada animação reduz carga cognitiva ou confirma uma ação — nunca decora.

**2.2.1 — Page Transitions:**

```typescript
// components/PageTransition.tsx
"use client";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const variants = {
  initial: { opacity: 0, y: 6 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.15, ease: "easeIn" } },
};

export function PageTransition({ children }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={pathname} variants={variants} initial="initial" animate="enter" exit="exit">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**2.2.2 — Booking Confirmation — "Satisfação ao Concluir":**

Animação central do produto. Ao criar uma reserva, o ícone de check se "desenha" com spring physics.

```typescript
// components/BookingSuccessAnimation.tsx
"use client";
import { motion } from "framer-motion";

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1, opacity: 1,
    transition: {
      pathLength: { type: "spring", duration: 0.6, bounce: 0 },
      opacity: { duration: 0.01 },
    },
  },
};

const container = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 400, damping: 20 } },
};

export function BookingSuccessAnimation() {
  return (
    <motion.div variants={container} initial="hidden" animate="visible"
      className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-500">
      <motion.svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M4 12l6 6L20 6"
          stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          variants={draw} initial="hidden" animate="visible"
        />
      </motion.svg>
    </motion.div>
  );
}
```

**2.2.3 — Skeleton Loaders:**

```typescript
// components/ui/skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-ink-faint/30", className)} />;
}

export function ClientListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-card border">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}
```

**2.2.4 — Form Validation Feedback:**

```typescript
// components/ui/input.tsx
export function Input({ error, ...props }: InputProps) {
  return (
    <div className="relative">
      <input
        className={cn(
          "w-full px-3 py-2 rounded-md border transition-shadow",
          error
            ? "border-red-400 focus:shadow-[0_0_0_3px_rgb(248_113_113_/_0.2)]"
            : "border-ink-faint focus:shadow-input-focus"
        )}
        {...props}
      />
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-1 text-xs text-red-500 overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**2.2.5 — Toast com Sonner:**

```typescript
// app/layout.tsx
import { Toaster } from "sonner";
<Toaster position="bottom-right" richColors
  toastOptions={{ style: { fontFamily: "var(--font-geist-sans)" }, duration: 4000 }} />

// Uso:
toast.success("Reserva criada", {
  description: "Sala 3 · Quinta, 14:00–15:00",
  icon: <BookingSuccessAnimation />,
});
toast.error("Horário indisponível", { description: `Sala já reservada por ${userName}` });
```

**2.2.6 — Stagger em Listas:**

```typescript
// components/AnimatedList.tsx
const listVariants  = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const itemVariants  = {
  hidden:  { opacity: 0, x: -8 },
  visible: { opacity: 1, x:  0, transition: { duration: 0.2 } },
};

export function AnimatedList({ items, renderItem }) {
  return (
    <motion.ul variants={listVariants} initial="hidden" animate="visible">
      {items.map((item) => (
        <motion.li key={item.id} variants={itemVariants}>{renderItem(item)}</motion.li>
      ))}
    </motion.ul>
  );
}
```

---

### 2.3 React Three Fiber — Visualizações 3D Discretas

**Filosofia:** 3D como informação, não decoração. O widget deve ser legível em 3 segundos por qualquer usuário.

**2.3.1 — RoomOccupancyWidget (Dashboard):**

Cilindros flutuantes por sala. Altura = taxa de ocupação. Cor interpola de `#6366f1` (livre) → `#f59e0b` → `#ef4444` (lotada).

```typescript
// components/3d/RoomOccupancyWidget.tsx
"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Float } from "@react-three/drei";
import { useRef, Suspense } from "react";
import * as THREE from "three";

function OccupancyBar({ name, occupancy, index }: { name: string; occupancy: number; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const maxHeight = 3;
  const height = Math.max(0.1, occupancy * maxHeight);

  const color = new THREE.Color().lerpColors(
    new THREE.Color("#6366f1"),
    new THREE.Color(occupancy > 0.75 ? "#ef4444" : "#f59e0b"),
    occupancy > 0.5 ? (occupancy - 0.5) * 2 : 0
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    // Respiração leve — amplitude 0.02 para não distrair
    meshRef.current.position.y =
      height / 2 + Math.sin(state.clock.elapsedTime * 0.8 + index) * 0.02;
  });

  return (
    <Float speed={0} floatIntensity={0}>
      <mesh ref={meshRef} position={[index * 1.4 - 2.1, height / 2, 0]}>
        <cylinderGeometry args={[0.35, 0.35, height, 32]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>
      <Text position={[index * 1.4 - 2.1, -0.4, 0]} fontSize={0.22} color="#6b7280" anchorX="center">
        {name.substring(0, 6)}
      </Text>
      <Text position={[index * 1.4 - 2.1, height + 0.35, 0]} fontSize={0.2} color="#374151" anchorX="center">
        {Math.round(occupancy * 100)}%
      </Text>
    </Float>
  );
}

export function RoomOccupancyWidget({ rooms }: { rooms: { name: string; occupancy: number }[] }) {
  return (
    <div className="h-48 w-full rounded-card overflow-hidden">
      <Canvas camera={{ position: [0, 2, 6], fov: 45 }}
        gl={{ antialias: false, powerPreference: "low-power" }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          {rooms.map((room, i) => <OccupancyBar key={room.name} {...room} index={i} />)}
        </Suspense>
      </Canvas>
    </div>
  );
}
```

**Dados em tempo real para o widget (Server Component):**

```typescript
// app/(dashboard)/page.tsx
async function getRoomOccupancy(tenantId: string) {
  const today = new Date();
  const rooms = await prisma.room.findMany({
    where: { tenantId, active: true },
    include: {
      bookings: {
        where: { active: true, startsAt: { gte: startOfDay(today) }, endsAt: { lte: endOfDay(today) } },
      },
    },
  });
  const availableMinutes = 15 * 60; // 07:00–22:00
  return rooms.map((room) => ({
    name: room.name,
    occupancy:
      room.bookings.reduce((acc, b) => acc + differenceInMinutes(b.endsAt, b.startsAt), 0) /
      availableMinutes,
  }));
}
```

**2.3.2 — Login Background (Partículas Discretas):**

```typescript
// components/3d/LoginBackground.tsx
"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function Particles({ count = 600 }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!points.current) return;
    points.current.rotation.y = state.clock.elapsedTime * 0.017;
    points.current.rotation.x = state.clock.elapsedTime * 0.008;
  });

  return (
    <Points ref={points} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent size={0.04} color="#818cf8"
        sizeAttenuation depthWrite={false} opacity={0.5} />
    </Points>
  );
}

export function LoginBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none opacity-60">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: false, powerPreference: "low-power" }}>
        <Particles />
      </Canvas>
    </div>
  );
}
```

**Considerações de performance:**

- Ambos os widgets usam `dynamic(() => import(...), { ssr: false })` — sem SSR de WebGL.
- `prefers-reduced-motion: reduce` → widgets substituídos por versões estáticas (barra de progresso simples no lugar dos cilindros).
- `gl={{ powerPreference: "low-power" }}` em todos os Canvas em produção.

---

### 2.4 Sistema de Notificações

**O legado prometia SMS (`aceita_receber_sms`) e nunca implementou. O Morpheus entrega e-mail + WhatsApp.**

**2.4.1 — Schema Prisma — Fila de Notificações:**

```prisma
model NotificationQueue {
  id          String      @id @default(cuid())
  tenantId    String
  recipientId String
  channel     NotifChannel
  type        NotifType
  payload     Json
  status      NotifStatus @default(PENDING)
  scheduledAt DateTime
  sentAt      DateTime?
  error       String?
  retries     Int         @default(0)
  createdAt   DateTime    @default(now())

  @@index([status, scheduledAt])
}

enum NotifChannel { EMAIL WHATSAPP }
enum NotifType    { BOOKING_CONFIRMATION APPOINTMENT_REMINDER APPOINTMENT_CANCELLATION }
enum NotifStatus  { PENDING SENT FAILED CANCELLED }
```

**2.4.2 — Templates React Email (Resend):**

```typescript
// emails/AppointmentReminderEmail.tsx
import { Html, Body, Container, Text, Heading, Hr } from "@react-email/components";

export function AppointmentReminderEmail({ clientName, psychologistName, date, time, clinicName, clinicPhone }) {
  return (
    <Html lang="pt-BR">
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "40px auto", backgroundColor: "#ffffff",
          borderRadius: "12px", padding: "40px" }}>
          <Heading style={{ color: "#111827", fontSize: "20px", fontWeight: "600" }}>
            Lembrete de Consulta
          </Heading>
          <Text style={{ color: "#6b7280", fontSize: "15px", lineHeight: "1.6" }}>
            Olá, <strong>{clientName}</strong>. Sua consulta é amanhã.
          </Text>
          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />
          <Text style={{ color: "#374151", fontSize: "15px" }}>
            📅 <strong>{date}</strong> às <strong>{time}</strong><br />
            👩‍⚕️ Com <strong>{psychologistName}</strong><br />
            🏥 <strong>{clinicName}</strong>
          </Text>
          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />
          <Text style={{ color: "#9ca3af", fontSize: "13px" }}>Dúvidas? {clinicPhone}</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Templates a implementar:**

| Template | Gatilho | Canal |
|---|---|---|
| `AppointmentConfirmation` | Consulta criada | E-mail |
| `AppointmentReminder` | 24h antes | E-mail + WhatsApp |
| `AppointmentCancellation` | Status → CANCELLED | E-mail + WhatsApp |
| `BookingConfirmation` | Reserva de sala criada | E-mail (psicóloga) |
| `PasswordReset` | Solicitação de reset | E-mail |
| `WelcomeTenant` | Novo tenant criado | E-mail |

**2.4.3 — Envio via Resend:**

```typescript
// lib/notifications/email.ts
import { Resend } from "resend";
import { render } from "@react-email/render";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, template }) {
  return resend.emails.send({
    from: "Morpheus <notificacoes@morpheus.app>",
    to, subject,
    html: render(template),
  });
}
```

**2.4.4 — WhatsApp via Evolution API:**

```typescript
// lib/notifications/whatsapp.ts
export async function sendWhatsApp(to: string, message: string) {
  const phone = to.replace(/\D/g, "").replace(/^0/, "55");
  const response = await fetch(
    `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_NAME}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({ number: `${phone}@s.whatsapp.net`, text: message }),
    }
  );
  if (!response.ok) throw new Error(`Evolution API error: ${response.status}`);
  return response.json();
}

export function reminderWhatsAppMessage({ clientName, date, time, psychologistName, clinicName }) {
  return [
    `Olá, ${clientName}! 👋`,
    ``,
    `Lembrete da sua consulta de amanhã:`,
    `📅 *${date}* às *${time}*`,
    `👩‍⚕️ Com *${psychologistName}*`,
    `🏥 *${clinicName}*`,
    ``,
    `Qualquer dúvida, entre em contato com a clínica.`,
  ].join("\n");
}
```

**2.4.5 — Fila via Vercel Cron (a cada hora):**

```typescript
// app/api/cron/notifications/route.ts
// vercel.json: { "crons": [{ "path": "/api/cron/notifications", "schedule": "0 * * * *" }] }

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("Unauthorized", { status: 401 });

  const pending = await prisma.notificationQueue.findMany({
    where: { status: "PENDING", scheduledAt: { lte: new Date() }, retries: { lt: 3 } },
    take: 50,
    orderBy: { scheduledAt: "asc" },
  });

  const results = await Promise.allSettled(pending.map(processNotification));

  return Response.json({
    sent:   results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  });
}

async function processNotification(notif: NotificationQueue) {
  try {
    if (notif.channel === "EMAIL")    await dispatchEmail(notif);
    if (notif.channel === "WHATSAPP") await dispatchWhatsApp(notif);
    await prisma.notificationQueue.update({
      where: { id: notif.id }, data: { status: "SENT", sentAt: new Date() },
    });
  } catch (error) {
    await prisma.notificationQueue.update({
      where: { id: notif.id },
      data: { retries: { increment: 1 }, status: notif.retries >= 2 ? "FAILED" : "PENDING", error: String(error) },
    });
    throw error;
  }
}
```

**Agendamento ao criar consulta:**

```typescript
// Chamado dentro de scheduleAppointment() após criar o Appointment
async function enqueueAppointmentNotifications(appointment: Appointment, client: Client) {
  const notifications = [];

  if (client.consentEmail && client.email) {
    notifications.push({
      tenantId: appointment.tenantId, recipientId: client.id,
      channel: "EMAIL", type: "APPOINTMENT_CONFIRMATION",
      payload: { /* dados */ }, scheduledAt: new Date(),
    });
  }

  if (client.consentWhatsapp && client.phone) {
    notifications.push({
      tenantId: appointment.tenantId, recipientId: client.id,
      channel: "WHATSAPP", type: "APPOINTMENT_REMINDER",
      payload: { /* dados */ }, scheduledAt: subHours(appointment.startsAt, 24),
    });
  }

  if (notifications.length > 0) await prisma.notificationQueue.createMany({ data: notifications });
}
```

---

### 2.5 Checklist FASE 2

**UI System:**
- [ ] Design tokens em `tailwind.config.ts` e CSS variables dark/light
- [ ] Refatoração de todos os componentes da FASE 1 para os tokens
- [ ] `next-themes` com toggle no header do dashboard
- [ ] Todos os 11 componentes `ui/` implementados com variantes documentadas

**Framer Motion:**
- [ ] `PageTransition` com `AnimatePresence` no layout do dashboard
- [ ] `BookingSuccessAnimation` (SVG path draw com spring physics)
- [ ] Skeletons em todas as listagens (clients, psychologists, appointments)
- [ ] `AnimatedList` com stagger nos CRUDs
- [ ] Feedback de validação animado em todos os `Input`
- [ ] `Toaster` (Sonner) com dark mode + ícone de sucesso customizado

**React Three Fiber:**
- [ ] `RoomOccupancyWidget` com cilindros, respiração e cor interpolada
- [ ] `LoginBackground` com partículas low-power
- [ ] Ambos com `dynamic({ ssr: false })` e stub para `prefers-reduced-motion`
- [ ] Lighthouse performance ≥ 90 com os widgets ativos

**Notificações:**
- [ ] Schema `NotificationQueue` com migration Prisma
- [ ] Conta Resend + domínio verificado
- [ ] 6 templates React Email implementados e testados visualmente
- [ ] Evolution API self-hosted com instância WhatsApp conectada
- [ ] Vercel Cron `/api/cron/notifications` com `CRON_SECRET`
- [ ] `enqueueAppointmentNotifications()` integrado ao `scheduleAppointment()` e ao cancelamento
- [ ] Painel `/dashboard/admin/notifications` com status da fila (PENDING/SENT/FAILED)

---

## FASE 3: Billing & Advanced Finance

**Objetivo:** Substituir o gateway NAC Solution e o fluxo de boletos em disco por infraestrutura Stripe completa — cobrança do SaaS, pagamentos de sessões por PIX e cartão, e relatórios financeiros para psicólogas.

**Critério de conclusão:** Uma psicóloga recebe o pagamento de um cliente via PIX sem intervenção da recepção. A clínica assina e cancela o plano SaaS sem contato humano.

**Dependência:** FASE 2 concluída. Conta Stripe aprovada para o Brasil.

---

### 3.1 Billing do SaaS — Assinatura da Clínica

**3.1.1 — Schema Prisma (adições ao Tenant):**

```prisma
model Tenant {
  // ... campos existentes
  stripeCustomerId     String? @unique
  stripeSubscriptionId String? @unique
  subscriptionStatus   SubscriptionStatus @default(TRIALING)
  trialEndsAt          DateTime?
  currentPeriodEnd     DateTime?
}

enum SubscriptionStatus { TRIALING ACTIVE PAST_DUE CANCELLED UNPAID }
```

**3.1.2 — Checkout de Assinatura:**

```typescript
// app/api/billing/checkout/route.ts
export async function POST(req: Request) {
  const tenantId = await getServerTenantId();
  const { priceId } = await req.json();
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

  // Cria ou recupera Customer Stripe
  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ name: tenant.name, metadata: { tenantId } });
    customerId = customer.id;
    await prisma.tenant.update({ where: { id: tenantId }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?cancelled=true`,
    subscription_data: { trial_period_days: 14, metadata: { tenantId } },
    locale: "pt-BR",
  });

  return Response.json({ url: session.url });
}
```

**3.1.3 — Customer Portal:**

```typescript
// app/api/billing/portal/route.ts
export async function POST(req: Request) {
  const tenantId = await getServerTenantId();
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  if (!tenant.stripeCustomerId)
    return Response.json({ error: "Sem assinatura ativa" }, { status: 400 });

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  });
  return Response.json({ url: session.url });
}
```

---

### 3.2 Stripe Connect — Contas das Psicólogas

Cada psicóloga opera como `Stripe Connected Account`. Dados bancários ficam no Stripe — jamais no banco do Morpheus.

**Schema (adições ao Psychologist):**

```prisma
model Psychologist {
  // ... campos existentes
  stripeAccountId     String?       @unique
  stripeAccountStatus ConnectStatus @default(NOT_CONNECTED)
}

enum ConnectStatus { NOT_CONNECTED PENDING ACTIVE RESTRICTED }
```

**Onboarding da psicóloga:**

```typescript
// app/api/psychologists/[id]/connect/route.ts
export async function POST(req: Request, { params }) {
  const tenantId = await getServerTenantId();
  const psychologist = await prisma.psychologist.findUniqueOrThrow({ where: { id: params.id, tenantId } });

  let accountId = psychologist.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express", country: "BR",
      email: psychologist.email ?? undefined,
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
      metadata: { psychologistId: psychologist.id, tenantId },
    });
    accountId = account.id;
    await prisma.psychologist.update({
      where: { id: params.id },
      data: { stripeAccountId: accountId, stripeAccountStatus: "PENDING" },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/psychologists/${params.id}?connect=refresh`,
    return_url:  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/psychologists/${params.id}?connect=success`,
    type: "account_onboarding",
  });

  return Response.json({ url: accountLink.url });
}
```

---

### 3.3 Cobrança de Sessões

**Dois modos de cobrança configuráveis por tenant:**

| Modo | Descrição | Equivalente Legado |
|---|---|---|
| **Por Sessão** | Payment Link por consulta — cliente paga individualmente via PIX ou Cartão | Novo |
| **Fatura Mensal** | Consultas do mês agrupadas em Stripe Invoice | `tb_emissao_boletos` (lote) |

**Schema (adições ao Appointment):**

```prisma
model Appointment {
  // ... campos existentes
  stripePaymentIntentId String?
  stripeInvoiceId       String?
  invoiceBatchId        String?
  invoiceBatch          InvoiceBatch? @relation(fields: [invoiceBatchId], references: [id])
}

model InvoiceBatch {
  id             String       @id @default(cuid())
  tenantId       String
  psychologistId String
  psychologist   Psychologist @relation(fields: [psychologistId], references: [id])
  periodStart    DateTime
  periodEnd      DateTime
  status         BatchStatus  @default(OPEN)
  stripeInvoiceIds Json?
  createdAt      DateTime     @default(now())
  appointments   Appointment[]
}

enum BatchStatus { OPEN INVOICED PARTIALLY_PAID PAID }
```

**Payment Link por Sessão (PIX + Cartão):**

```typescript
// app/api/appointments/[id]/payment-link/route.ts
export async function POST(req: Request, { params }) {
  const tenantId = await getServerTenantId();
  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: params.id, tenantId },
    include: { client: true, psychologist: true },
  });

  if (!appointment.psychologist.stripeAccountId)
    return Response.json({ error: "Psicóloga sem Stripe configurado" }, { status: 400 });

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{
      price_data: {
        currency: "brl",
        product_data: {
          name: `Consulta — ${appointment.psychologist.name}`,
          description: format(appointment.startsAt, "dd/MM/yyyy HH:mm", { locale: ptBR }),
        },
        unit_amount: Math.round(Number(appointment.value) * 100),
      },
      quantity: 1,
    }],
    payment_method_types: ["card", "pix"],
    transfer_data: { destination: appointment.psychologist.stripeAccountId },
    metadata: { appointmentId: appointment.id, tenantId },
    after_completion: {
      type: "redirect",
      redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL}/pagamento/obrigado` },
    },
  });

  await prisma.appointment.update({ where: { id: params.id }, data: { paymentStatus: "INVOICED" } });
  return Response.json({ url: paymentLink.url });
}
```

**Fatura Mensal (Lote) via Stripe Invoicing:**

```typescript
// services/invoiceBatch.service.ts
export async function generateMonthlyInvoices(batchId: string) {
  const batch = await prisma.invoiceBatch.findUniqueOrThrow({
    where: { id: batchId },
    include: {
      appointments: {
        where: { status: { notIn: ["CANCELLED"] }, paymentStatus: "PENDING" },
        include: { client: true },
      },
      psychologist: true,
    },
  });

  const byClient = groupBy(batch.appointments, (a) => a.clientId);
  const invoiceIds: Record<string, string> = {};

  for (const [clientId, appointments] of Object.entries(byClient)) {
    const client = appointments[0].client;
    if (!client.email) continue;

    const stripeCustomer = await getOrCreateStripeCustomer(client);

    const invoice = await stripe.invoices.create({
      customer: stripeCustomer.id,
      collection_method: "send_invoice",
      days_until_due: 5,
      transfer_data: batch.psychologist.stripeAccountId
        ? { destination: batch.psychologist.stripeAccountId } : undefined,
      metadata: { batchId, clientId, tenantId: batch.tenantId },
    });

    for (const appt of appointments) {
      await stripe.invoiceItems.create({
        customer: stripeCustomer.id, invoice: invoice.id,
        price_data: {
          currency: "brl",
          product_data: {
            name: `Consulta — ${format(appt.startsAt, "dd/MM", { locale: ptBR })}${appt.status === "NO_SHOW" ? " (falta)" : ""}`,
          },
          unit_amount: Math.round(Number(appt.value) * 100),
        },
        quantity: 1,
      });
    }

    await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(invoice.id); // e-mail automático do Stripe

    invoiceIds[clientId] = invoice.id;
    await prisma.appointment.updateMany({
      where: { id: { in: appointments.map((a) => a.id) } },
      data: { stripeInvoiceId: invoice.id, paymentStatus: "INVOICED" },
    });
  }

  await prisma.invoiceBatch.update({
    where: { id: batchId },
    data: { status: "INVOICED", stripeInvoiceIds: invoiceIds },
  });
}
```

---

### 3.4 Webhook Handler Stripe

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const body = await req.text();
  const sig  = headers().get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch { return new Response("Invalid signature", { status: 400 }); }

  switch (event.type) {
    // ── Assinaturas SaaS ──────────────────────────────────────────
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.tenant.update({
        where: { id: sub.metadata.tenantId },
        data: {
          stripeSubscriptionId: sub.id,
          subscriptionStatus: mapStripeStatus(sub.status),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          plan: mapStripePriceToPlan(sub.items.data[0].price.id),
        },
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.tenant.update({ where: { stripeSubscriptionId: sub.id }, data: { subscriptionStatus: "CANCELLED" } });
      break;
    }

    // ── Faturas ───────────────────────────────────────────────────
    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      await prisma.appointment.updateMany({ where: { stripeInvoiceId: inv.id }, data: { paymentStatus: "PAID" } });
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      await prisma.appointment.updateMany({ where: { stripeInvoiceId: inv.id }, data: { paymentStatus: "OVERDUE" } });
      break;
    }

    // ── Connect ───────────────────────────────────────────────────
    case "account.updated": {
      const acc = event.data.object as Stripe.Account;
      const isActive = acc.charges_enabled && acc.payouts_enabled;
      await prisma.psychologist.updateMany({
        where: { stripeAccountId: acc.id },
        data: { stripeAccountStatus: isActive ? "ACTIVE" : "PENDING" },
      });
      break;
    }

    // ── Payment Links ─────────────────────────────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { appointmentId } = session.metadata as { appointmentId: string };
      if (appointmentId) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { paymentStatus: "PAID", stripePaymentIntentId: session.payment_intent as string },
        });
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
```

---

### 3.5 Relatórios Financeiros

```typescript
// services/reports.service.ts

// Faturamento por psicóloga no período
export async function revenueByPsychologist(tenantId: string, from: Date, to: Date) {
  return prisma.appointment.groupBy({
    by: ["psychologistId"],
    where: { tenantId, startsAt: { gte: from, lte: to }, status: { not: "CANCELLED" }, active: true },
    _sum: { value: true },
    _count: { id: true },
  });
}

// Taxa de falta
export async function noShowRate(tenantId: string, from: Date, to: Date) {
  const total    = await prisma.appointment.count({ where: { tenantId, startsAt: { gte: from, lte: to }, status: { not: "CANCELLED" } } });
  const noShows  = await prisma.appointment.count({ where: { tenantId, startsAt: { gte: from, lte: to }, status: "NO_SHOW" } });
  return total > 0 ? (noShows / total) * 100 : 0;
}

// Inadimplência: realizadas sem pagamento após 30 dias
export async function overdueAppointments(tenantId: string) {
  return prisma.appointment.findMany({
    where: {
      tenantId, status: "COMPLETED", paymentStatus: "PENDING",
      startsAt: { lte: subDays(new Date(), 30) }, active: true,
    },
    include: { client: { select: { name: true } }, psychologist: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });
}
```

**Exportação CSV com BOM UTF-8 (compatível com Excel):**

```typescript
// app/api/reports/appointments/export/route.ts
export async function GET(req: Request) {
  const tenantId = await getServerTenantId();
  const { searchParams } = new URL(req.url);
  const from = new Date(searchParams.get("from")!);
  const to   = new Date(searchParams.get("to")!);

  const appointments = await prisma.appointment.findMany({
    where: { tenantId, startsAt: { gte: from, lte: to }, active: true },
    include: { client: { select: { name: true } }, psychologist: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });

  const rows = [
    ["Data", "Hora", "Psicóloga", "Cliente", "Valor", "Status", "Pagamento"].join(";"),
    ...appointments.map((a) => [
      format(a.startsAt, "dd/MM/yyyy"),
      format(a.startsAt, "HH:mm"),
      a.psychologist.name,
      a.client.name,
      Number(a.value).toFixed(2).replace(".", ","),
      a.status,
      a.paymentStatus,
    ].join(";")),
  ].join("\n");

  return new Response(`\uFEFF${rows}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="consultas-${format(from, "yyyy-MM")}.csv"`,
    },
  });
}
```

---

### 3.6 Checklist FASE 3

**Stripe SaaS:**
- [ ] Conta Stripe aprovada para o Brasil
- [ ] Produtos e Preços criados no Dashboard (IDs em `.env`)
- [ ] Campos `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus` no Tenant
- [ ] Checkout com trial de 14 dias
- [ ] Customer Portal para autogestão de plano e cartão
- [ ] Webhook: `subscription.created/updated/deleted`
- [ ] Guard de acesso por `subscriptionStatus` (bloqueia CANCELLED/UNPAID com interstitial)
- [ ] Página `/dashboard/billing` com status e histórico de faturas

**Stripe Connect:**
- [ ] Campos `stripeAccountId`, `stripeAccountStatus` no Psychologist
- [ ] Onboarding via `account_onboarding` link
- [ ] Webhook: `account.updated`
- [ ] Badge de status do Connect no perfil da psicóloga

**Cobrança:**
- [ ] Payment link por sessão (PIX + Cartão) com `transfer_data`
- [ ] Fluxo de fatura mensal (`InvoiceBatch` → `generateMonthlyInvoices`)
- [ ] Webhook: `invoice.paid`, `invoice.payment_failed`, `checkout.session.completed`
- [ ] Botão "Gerar Faturas do Mês" no painel admin com confirmação

**Relatórios:**
- [ ] Dashboard: faturamento por psicóloga, taxa de falta, inadimplência
- [ ] Exportação CSV com BOM UTF-8
- [ ] Filtros: período + psicóloga

---

## FASE 4: Compliance & Scale (LGPD)

**Objetivo:** Tornar o Morpheus legalmente sólido para operar com dados de saúde no Brasil e escalar a infraestrutura para múltiplos tenants em produção sem degradação.

**Critério de conclusão:** Um DPO consegue responder a qualquer solicitação de titular (acesso, retificação, exclusão, portabilidade) em menos de 10 minutos usando o painel `/admin/lgpd`.

**Dependência:** FASE 3 concluída.

---

### 4.1 Criptografia de Dados em Repouso

**Campos PII a criptografar:**

| Modelo | Campos |
|---|---|
| `Client` | `cpf`, `birthDate`, `phone`, `address` |
| `Psychologist` | `cpf`, `birthDate`, `phone`, `address` |

**Implementação via `prisma-field-encryption`:**

```typescript
// lib/prisma.ts
import { fieldEncryptionExtension } from "prisma-field-encryption";

const prisma = new PrismaClient().$extends(
  fieldEncryptionExtension({ encryptionKey: process.env.FIELD_ENCRYPTION_KEY! })
);
```

```prisma
// Marcar campos no schema com /// @encrypted
model Client {
  cpf       String? @db.Char(11) /// @encrypted
  birthDate DateTime?            /// @encrypted
  phone     String?              /// @encrypted
  address   Json?                /// @encrypted
}
```

**Geração da chave (AES-256-GCM, 32 bytes):**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → armazenar em FIELD_ENCRYPTION_KEY (Vercel/Railway secrets)
```

**Busca em campo criptografado (HMAC determinístico para CPF):**

```prisma
model Client {
  cpf     String? @db.Char(11) /// @encrypted
  cpfHmac String? @unique       // HMAC(cpf, HMAC_SECRET) — para buscas
}
```

```typescript
import { createHmac } from "crypto";

function cpfHmac(cpf: string): string {
  return createHmac("sha256", process.env.HMAC_SECRET!).update(cpf).digest("hex");
}

// Busca por CPF:
await prisma.client.findFirst({ where: { cpfHmac: cpfHmac(searchCpf) } });

// Ao salvar/atualizar cliente:
await prisma.client.create({ data: { cpf, cpfHmac: cpfHmac(cpf), ... } });
```

---

### 4.2 Direitos do Titular (LGPD — Arts. 17–22)

**Painel DPO (`/admin/lgpd`) — acesso exclusivo `SUPER_ADMIN`:**

```
/admin/lgpd
├── Busca de titular (email ou CPF)
├── Exportação de dados — portabilidade (Art. 18, V)
├── Retificação assistida (Art. 18, III)
├── Anonimização / Exclusão (Art. 18, VI)
└── Histórico de solicitações de titulares
```

**Exportação de Dados (ZIP):**

```typescript
// app/api/admin/lgpd/export/route.ts
import JSZip from "jszip";

export async function POST(req: Request) {
  const { clientId } = await req.json();
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    include: { appointments: true, psychologist: { select: { name: true } } },
  });

  const zip = new JSZip();

  zip.file("dados_pessoais.json", JSON.stringify({
    nome: client.name, cpf: client.cpf, email: client.email,
    telefone: client.phone, nascimento: client.birthDate, endereco: client.address,
    consentimentos: { sms: client.consentSms, email: client.consentEmail, whatsapp: client.consentWhatsapp },
    cadastradoEm: client.createdAt,
  }, null, 2));

  zip.file("consultas.json", JSON.stringify(
    client.appointments.map((a) => ({
      data: a.startsAt,
      duracao: `${differenceInMinutes(a.endsAt, a.startsAt)} minutos`,
      psicologa: client.psychologist.name,
      valor: Number(a.value).toFixed(2),
      status: a.status, statusFinanceiro: a.paymentStatus,
    })), null, 2
  ));

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: clientId, entity: "Client" }, orderBy: { createdAt: "asc" },
  });
  zip.file("log_acessos.json", JSON.stringify(
    auditLogs.map((l) => ({ acao: l.action, quando: l.createdAt, ipOrigem: l.ipAddress })), null, 2
  ));

  await audit({ action: "VIEW", entity: "Client", entityId: clientId, metadata: { reason: "LGPD export" } });

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="dados-titular-${clientId}.zip"`,
    },
  });
}
```

**Anonimização Efetiva (Art. 18, VI):**

```typescript
// services/lgpd.service.ts
export async function anonymizeClient(clientId: string, requestedBy: string) {
  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: `[Cliente Removido ${clientId.slice(-6)}]`,
      cpf: null, cpfHmac: null, birthDate: null,
      email: null, phone: null, address: null,
      consentSms: false, consentEmail: false, consentWhatsapp: false,
      active: false,
    },
  });
  await audit({ action: "DELETE", entity: "Client", entityId: clientId,
    userId: requestedBy, metadata: { reason: "LGPD right to erasure" } });
}
```

**Registro de Solicitações de Titulares:**

```prisma
model DataSubjectRequest {
  id           String    @id @default(cuid())
  tenantId     String
  subjectName  String
  subjectEmail String
  type         DSRType
  status       DSRStatus @default(OPEN)
  requestedAt  DateTime  @default(now())
  resolvedAt   DateTime?
  resolvedBy   String?
  notes        String?
}

enum DSRType   { ACCESS RECTIFICATION ERASURE PORTABILITY OBJECTION }
enum DSRStatus { OPEN IN_PROGRESS RESOLVED REJECTED }
```

---

### 4.3 Política de Retenção de Dados

```prisma
model RetentionPolicy {
  id              String  @id @default(cuid())
  tenantId        String  @unique
  clientDataYears Int     @default(5)   // anonimiza clientes inativos após N anos
  auditLogDays    Int     @default(730) // purga logs após N dias (2 anos)
  tenant          Tenant  @relation(fields: [tenantId], references: [id])
}
```

**Cron de Retenção (domingo, 03:00):**

```typescript
// app/api/cron/retention/route.ts
// vercel.json: { "crons": [{ "path": "/api/cron/retention", "schedule": "0 3 * * 0" }] }

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("Unauthorized", { status: 401 });

  const policies = await prisma.retentionPolicy.findMany();

  for (const policy of policies) {
    const { tenantId, clientDataYears, auditLogDays } = policy;

    // 1. Anonimizar clientes inativos fora do prazo
    const cutoff = subYears(new Date(), clientDataYears);
    const expired = await prisma.client.findMany({
      where: { tenantId, active: false, updatedAt: { lte: cutoff }, cpf: { not: null } },
    });
    for (const client of expired) await anonymizeClient(client.id, "system:retention-cron");

    // 2. Purgar logs antigos
    await prisma.auditLog.deleteMany({
      where: { tenantId, createdAt: { lte: subDays(new Date(), auditLogDays) } },
    });
  }

  return Response.json({ processed: policies.length });
}
```

---

### 4.4 Rate Limiting e Segurança Avançada

**Rate Limiting com Upstash Redis:**

```typescript
// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const loginRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 tentativas / 15 min por IP
  prefix: "morpheus:login",
});

export const apiRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  prefix: "morpheus:api",
});
```

**Security Headers (`next.config.ts`):**

```typescript
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self' api.stripe.com *.sentry.io",
      "frame-src js.stripe.com hooks.stripe.com",
    ].join("; "),
  },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
```

---

### 4.5 Monitoramento e Observabilidade

**Sentry (sem PII nos eventos):**

```typescript
// sentry.server.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  beforeSend(event) {
    if (event.request?.data) delete event.request.data;
    if (event.request?.headers?.authorization) delete event.request.headers.authorization;
    return event;
  },
});
```

**Pino Logging (com redact de PII):**

```typescript
// lib/logger.ts
import pino from "pino";
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: ["req.headers.authorization", "body.password", "body.cpf"],
});
```

**Health Check:**

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "connected", ts: new Date().toISOString() });
  } catch {
    return Response.json({ status: "error", db: "disconnected" }, { status: 503 });
  }
}
```

---

### 4.6 Checklist FASE 4

**Criptografia:**
- [ ] `prisma-field-encryption` configurado com `FIELD_ENCRYPTION_KEY` (AES-256)
- [ ] Campos PII marcados com `/// @encrypted` no schema
- [ ] `cpfHmac` implementado para buscas em CPF criptografado
- [ ] Script de criptografia retroativa dos dados existentes
- [ ] Documentação de rotação de chaves (anual)

**LGPD:**
- [ ] Rota `/admin/lgpd` com guard `SUPER_ADMIN`
- [ ] Exportação ZIP: `dados_pessoais.json`, `consultas.json`, `log_acessos.json`
- [ ] `anonymizeClient()` com sobrescrita completa de PII
- [ ] Model `DataSubjectRequest` para registro de solicitações
- [ ] Model `RetentionPolicy` por tenant (UI de configuração para admin)
- [ ] Cron `/api/cron/retention` com anonimização + purga de logs

**Segurança:**
- [ ] Rate limiting no login (5 / 15 min por IP via Upstash)
- [ ] Rate limiting geral na API (100 req/min por token)
- [ ] Security headers em `next.config.ts` (CSP testado sem violations)
- [ ] `CRON_SECRET` em todas as rotas de cron

**Observabilidade:**
- [ ] Sentry com `beforeSend` removendo PII
- [ ] Pino com `redact` de campos sensíveis
- [ ] `/api/health` respondendo e monitorado (Vercel Uptime ou Better Uptime)
- [ ] Alertas de erro: Sentry → Slack/e-mail do time

---

## FASE 5: Lapidação — O Produto que se Defende Sozinho

**Objetivo:** Transformar o Morpheus de um sistema correto e funcional em um produto que causa boa impressão em qualquer contexto — no primeiro acesso de um novo usuário, no audit de um investidor, no teste de um time de QA, e na tela do desenvolvedor que vai dar manutenção.

**Filosofia:** Nenhuma feature nova de negócio. Apenas rigor. Cada item desta fase é uma dívida que, se não paga, se acumula com juros.

**Critério de conclusão:** O produto passa nos seguintes audits automatizados com nota ≥ 95: Lighthouse (Performance, Acessibilidade, Best Practices, SEO), `npm audit` (zero vulnerabilidades críticas), e cobertura de testes ≥ 80% nas rotas críticas.

**Dependência:** Pode ser executada em sprints paralelos à FASE 4.

---

### 5.1 Performance — Core Web Vitals

**Metas:**

| Métrica | Meta |
|---|---|
| LCP (Largest Contentful Paint) | < 2.5s |
| INP (Interaction to Next Paint) | < 200ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| TTFB | < 800ms |
| Bundle JS inicial | < 150KB |

**Análise de Bundle:**

```bash
npm install @next/bundle-analyzer --save-dev

# next.config.ts
const withBundleAnalyzer = require("@next/bundle-analyzer")({ enabled: process.env.ANALYZE === "true" });
module.exports = withBundleAnalyzer({});

ANALYZE=true npm run build
```

**Code Splitting e Lazy Loading:**

```typescript
// Componentes pesados: sempre lazy com Suspense
const RoomCalendar = dynamic(() => import("@/components/RoomCalendar"), {
  loading: () => <CalendarSkeleton />, ssr: false,
});
const RoomOccupancyWidget = dynamic(() => import("@/components/3d/RoomOccupancyWidget"), { ssr: false });
const LoginBackground     = dynamic(() => import("@/components/3d/LoginBackground"),     { ssr: false });
```

**Database Query Optimization:**

```typescript
// Regra de ouro: TODA query em listagem usa select explícito
// ❌ prisma.client.findMany()
// ✅ prisma.client.findMany({ select: { id: true, name: true, psychologist: { select: { name: true } } } })

// N+1 detection em dev:
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? [{ emit: "event", level: "query" }] : [],
});
prisma.$on("query", (e) => {
  if (e.duration > 100) console.warn(`[SLOW QUERY] ${e.duration}ms: ${e.query.substring(0, 100)}`);
});
```

**Lighthouse CI no pipeline:**

```yaml
# .github/workflows/ci.yml
- name: Lighthouse CI
  run: |
    npm install -g @lhci/cli
    lhci autorun --collect.url=http://localhost:3000/login --assert.preset=lighthouse:no-pwa
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
# Bloqueia merge se performance < 90
```

---

### 5.2 Acessibilidade — WCAG 2.1 AA

**Filosofia:** Recepcionistas e psicólogas têm perfis variados. Leitores de tela e navegação por teclado não são "extras".

**Focus Management em Modais:**

```typescript
// Radix Dialog gerencia focus trap automaticamente
// Reforçar: foco ao primeiro input ao abrir, retorno ao trigger ao fechar
<Dialog.Content
  onOpenAutoFocus={(e) => {
    e.preventDefault();
    const firstInput = e.currentTarget.querySelector("input, select, button[data-primary]");
    (firstInput as HTMLElement)?.focus();
  }}
  onCloseAutoFocus={(e) => {
    e.preventDefault();
    triggerRef.current?.focus();
  }}
>
```

**Calendário acessível:**

```typescript
<FullCalendar
  eventDidMount={(info) => {
    info.el.setAttribute("tabindex", "0");
    info.el.setAttribute("role", "button");
    info.el.setAttribute("aria-label",
      `${info.event.title}, ${format(info.event.start!, "dd/MM HH:mm", { locale: ptBR })}`);
  }}
/>
```

**Correção de contraste:**

```
brand-500 (#6366f1) sobre branco = 3.0 → FALHA para texto normal
brand-700 (#4338ca) sobre branco = 5.8 → APROVADO ✓

Regra: usar brand-700 (nunca brand-500) para texto sobre fundo branco
```

**Loading State Acessível:**

```typescript
export function LoadingState({ message = "Carregando..." }) {
  return (
    <div role="status" aria-live="polite" aria-label={message} className="flex items-center gap-2">
      <Spinner aria-hidden="true" />
      <span className="sr-only">{message}</span>
    </div>
  );
}
```

**Axe-core nos E2E (zero violações obrigatório):**

```typescript
// playwright.config.ts
import AxeBuilder from "@axe-core/playwright";

test("dashboard não tem violações WCAG 2.1 AA", async ({ page }) => {
  await page.goto("/dashboard");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toHaveLength(0);
});
```

---

### 5.3 Responsividade Mobile e PWA

**Breakpoints e Layouts:**

```typescript
// Calendário: timeGridDay no mobile, timeGridWeek no desktop
const isMd = useMediaQuery("(min-width: 768px)");
<FullCalendar
  initialView={isMd ? "timeGridWeek" : "timeGridDay"}
  headerToolbar={{
    left: "prev,next", center: "title",
    right: isMd ? "timeGridWeek,timeGridDay" : "timeGridDay",
  }}
  longPressDelay={300}
  eventLongPressDelay={300}
/>

// Bottom Sheet no mobile (não modal centralizado)
// < 640px → Sheet que sobe do fundo da tela
// ≥ 640px → Dialog centralizado
```

**PWA:**

```typescript
// next.config.ts
const withPWA = require("next-pwa")({
  dest: "public", register: true, skipWaiting: true,
  runtimeCaching: [{
    urlPattern: /^https:\/\/.*\/dashboard/,
    handler: "NetworkFirst",
    options: { cacheName: "dashboard-cache", expiration: { maxAgeSeconds: 3600 } },
  }],
});
```

```json
// public/manifest.json
{
  "name": "Morpheus", "short_name": "Morpheus",
  "start_url": "/dashboard", "display": "standalone",
  "background_color": "#ffffff", "theme_color": "#6366f1",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

### 5.4 Cobertura de Testes

**Estratégia em três camadas:**

```
Unit (Vitest)       → Lógica de negócio isolada (validators, services puros)
Integration (Vitest + Prisma) → Services com banco de teste
E2E (Playwright)    → Fluxos críticos no browser
```

**Unit Tests — Casos críticos:**

```typescript
// tests/unit/roomBooking.test.ts
describe("detectOverlap", () => {
  it("detecta sobreposição parcial — corrige bug #15 do legado", () => {
    // Existente: 09:00–10:00 | Novo: 09:30–10:30 → conflito
    expect(detectOverlap(
      { start: new Date("2026-05-04T09:00"), end: new Date("2026-05-04T10:00") },
      { start: new Date("2026-05-04T09:30"), end: new Date("2026-05-04T10:30") }
    )).toBe(true);
  });

  it("não detecta falso conflito para eventos adjacentes", () => {
    // 09:00–10:00 e 10:00–11:00 → sem conflito
    expect(detectOverlap(
      { start: new Date("2026-05-04T09:00"), end: new Date("2026-05-04T10:00") },
      { start: new Date("2026-05-04T10:00"), end: new Date("2026-05-04T11:00") }
    )).toBe(false);
  });
});

describe("sanitizeCpf", () => {
  it("preserva zeros à esquerda — corrige bug #12 do legado", () => {
    expect(sanitizeCpf("012.345.678-90")).toBe("01234567890");
  });
  it("rejeita CPF com menos de 11 dígitos", () => {
    expect(() => sanitizeCpf("123.456.789")).toThrow();
  });
  it("rejeita CPF inválido pelo algoritmo", () => {
    expect(() => sanitizeCpf("111.111.111-11")).toThrow();
  });
});
```

**E2E — Fluxos críticos:**

```typescript
// tests/e2e/booking.spec.ts
test("cria reserva e detecta conflito de horário", async ({ page }) => {
  await loginAs(page, "receptionist");
  await page.goto("/dashboard/rooms");

  await page.click('[data-time="09:00:00"]');
  await page.fill("[data-testid='booking-title']", "Sessão Dra. Maria");
  await page.click("[data-testid='booking-submit']");
  await expect(page.locator("[data-testid='booking-success-check']")).toBeVisible();

  // Tenta criar conflito
  await page.click('[data-time="09:00:00"]');
  await page.fill("[data-testid='booking-title']", "Outra sessão");
  await page.click("[data-testid='booking-submit']");
  await expect(page.locator("[data-testid='toast-error']")).toContainText("já reservada");
});

// tests/e2e/cpf.spec.ts
test("preserva zeros à esquerda no CPF", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("/dashboard/clients/new");
  await page.fill("[name='cpf']", "012.345.678-90");
  await page.click("[data-testid='save-client']");
  await page.goto("/dashboard/clients");
  await expect(page.locator("[data-testid='client-cpf']").first()).toContainText("012.345.678-90");
});
```

**Metas de cobertura:**

| Camada | Meta |
|---|---|
| `lib/validators/` | 100% |
| `services/` | ≥ 85% |
| `app/api/` (routes) | ≥ 70% |
| Fluxos E2E críticos | 100% (login, reserva, agendamento, billing) |

---

### 5.5 Developer Experience

**Storybook para UI System:**

```bash
npx storybook@latest init
```

```typescript
// stories/BookingSuccessAnimation.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { BookingSuccessAnimation } from "@/components/BookingSuccessAnimation";

export default { title: "Animations/BookingSuccessAnimation", component: BookingSuccessAnimation } satisfies Meta;
export const Default: StoryObj = {};
```

Todos os 11 componentes `ui/` têm stories com variantes de estado (default, error, disabled, dark mode).

**OpenAPI / Swagger:**

```bash
npm install @asteasolutions/zod-to-openapi
# Gera spec a partir dos Zod schemas existentes nas API Routes
# Disponível em GET /api/docs (apenas dev + staging)
```

**`.env.example` Completo e Comentado:**

```bash
# Banco de Dados
DATABASE_URL=""               # postgresql://... (Neon ou Railway)

# Auth
NEXTAUTH_SECRET=""            # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY=""          # sk_live_... ou sk_test_...
STRIPE_WEBHOOK_SECRET=""      # whsec_... do endpoint registrado no Dashboard
STRIPE_PRICE_ID_ESSENTIAL=""
STRIPE_PRICE_ID_CLINIC=""

# Notificações
RESEND_API_KEY=""              # re_...
EVOLUTION_API_URL=""           # https://sua-instancia.evolution.app
EVOLUTION_API_KEY=""
EVOLUTION_INSTANCE_NAME=""

# Segurança
FIELD_ENCRYPTION_KEY=""       # openssl rand -hex 32 (AES-256)
HMAC_SECRET=""                 # openssl rand -hex 32 (busca de CPF)
CRON_SECRET=""                 # openssl rand -hex 16 (autenticação dos crons)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Observabilidade
SENTRY_DSN=""
NEXT_PUBLIC_SENTRY_DSN=""
LOG_LEVEL="info"              # debug | info | warn | error

# Analytics (opcional)
NEXT_PUBLIC_POSTHOG_KEY=""
```

**Makefile:**

```makefile
.PHONY: dev db-reset test e2e storybook analyze check

dev:         npm run dev
db-reset:    npx prisma migrate reset --force && npx prisma db seed
test:        npx vitest run --coverage
test-watch:  npx vitest
e2e:         npx playwright test
storybook:   npm run storybook
analyze:     ANALYZE=true npm run build
lint:        npx eslint . && npx tsc --noEmit
check: lint test
	@echo "✅ Todos os checks passaram"
```

---

### 5.6 Analytics de Produto e Feature Flags

**PostHog (sem cookies de terceiros — LGPD-friendly):**

```typescript
// app/providers.tsx
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",        // proxy pelo próprio domínio
  capture_pageview: false,    // controle manual
  persistence: "memory",     // sem localStorage/cookies
  loaded: (ph) => { if (process.env.NODE_ENV !== "production") ph.opt_out_capturing(); },
});
```

**Eventos de negócio capturados:**

```typescript
posthog.capture("booking_created",          { duration: durationMinutes });
posthog.capture("appointment_scheduled",    { hasConsentWhatsapp: client.consentWhatsapp });
posthog.capture("invoice_batch_generated",  { appointmentCount, totalValue });
posthog.capture("onboarding_step_completed",{ step: "first_room_created" });
posthog.capture("connect_onboarding_started", {});
```

**Feature Flags para rollout gradual:**

```typescript
// Ex: habilitar billing apenas para tenants beta
const showBillingModule = posthog.isFeatureEnabled("billing-module");
{showBillingModule && <BillingSection />}
```

---

### 5.7 SEO e Meta Tags

```typescript
// app/(dashboard)/layout.tsx — área privada
export const metadata: Metadata = {
  title: { template: "%s · Morpheus", default: "Morpheus" },
  robots: { index: false, follow: false }, // dashboard é privado — não indexar
};

// app/(marketing)/layout.tsx — páginas públicas (landing, preços)
export const metadata: Metadata = {
  title: { template: "%s · Morpheus", default: "Morpheus — Gestão Clínica" },
  description: "Gestão clínica inteligente para consultórios de psicologia",
  openGraph: {
    type: "website", locale: "pt_BR",
    url: "https://morpheus.app", siteName: "Morpheus",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};
```

---

### 5.8 Checklist FASE 5

**Performance:**
- [ ] `@next/bundle-analyzer` — JS inicial < 150KB confirmado
- [ ] `dynamic({ ssr: false })` em FullCalendar, RoomOccupancyWidget, LoginBackground
- [ ] `next/image` em todas as imagens sem exceção
- [ ] Índices do banco revisados — `EXPLAIN ANALYZE` nas queries de relatório
- [ ] Lighthouse CI no pipeline (bloqueia merge se < 90)

**Acessibilidade:**
- [ ] `axe-core` em todos os E2E — zero violações WCAG 2.1 AA
- [ ] Focus trap em todos os modais (Radix Dialog)
- [ ] Navegação por teclado no calendário testada manualmente
- [ ] `aria-label` em todos os ícones sem texto visível
- [ ] Cor de texto: brand-700 (não brand-500) sobre fundos brancos
- [ ] Loading states com `role="status"` e `aria-live="polite"`

**Mobile:**
- [ ] Layout testado em 375px, 768px, 1280px, 1920px
- [ ] Calendário com `timeGridDay` no mobile
- [ ] Bottom Sheet no lugar de Dialog em < 640px
- [ ] PWA configurado: `manifest.json` + service worker
- [ ] Long press delay configurado para drag no mobile

**Testes:**
- [ ] Vitest com coverage: 100% validators, ≥ 85% services
- [ ] Playwright E2E: login, reserva de sala, agendamento, billing, CPF zeros
- [ ] `axe` em todas as páginas principais (E2E)
- [ ] CI: testes bloqueiam merge em qualquer falha

**DX:**
- [ ] Storybook com stories de todos os 11 componentes `ui/` e suas variantes
- [ ] OpenAPI spec em `/api/docs` (dev/staging)
- [ ] `.env.example` 100% documentado
- [ ] `Makefile` com `dev`, `db-reset`, `test`, `e2e`, `check`
- [ ] `CONTRIBUTING.md` com setup local em < 5 minutos
- [ ] `CHANGELOG.md` atualizado a cada fase concluída

**Analytics:**
- [ ] PostHog com proxy `/ingest` (sem cookies — LGPD-friendly)
- [ ] 5 eventos de negócio implementados
- [ ] Feature flags configurados para rollout gradual da FASE 3 (billing)

---


## 4. Backlog de Dívida Técnica — O que NÃO repetir

Esta seção mapeia os 36 problemas identificados no legado e documenta a decisão de design do Morpheus que os torna **impossíveis ou detectados automaticamente**.

### 4.1 Segurança Crítica

| # | Problema Legado | Mitigação Morpheus | Status |
|---|---|---|---|
| 1 | SQL injection em `admin.cfm` (linhas 15-20) | Prisma ORM — queries parametrizadas por padrão. SQL injection é impossível sem `$queryRaw`. | FASE 1 |
| 2 | Senhas em texto puro (`usu_co_matricula`) | `bcrypt` cost 12. O campo `passwordHash` nunca é retornado em queries de leitura. | FASE 1 |
| 3 | Login de fallback morto por `<cfabort>` | Fluxo de auth unitário via NextAuth. Sem dead code paths. | FASE 1 |
| 4 | Comentário de debug `bortoletto` em produção | Code review obrigatório via Pull Request antes de merge em `main`. | PROCESSO |
| 5 | Gateway de boletos via HTTP GET com dados sensíveis na URL | Stripe SDK server-side via HTTPS. Dados bancários jamais trafegam pelo Morpheus. | FASE 3 |
| 6 | `Session.codigo` referenciada mas nunca definida | TypeScript strict mode — variáveis não inicializadas são erro de compilação. | FASE 1 |
| 7 | `Application.chave` usada em crypto sem ser definida | Sem variáveis globais mutáveis. Chaves criptográficas em `process.env` com validação no startup. | FASE 1 |
| 8 | Sem CSRF protection | Next.js App Router com Server Actions usa proteção CSRF por padrão. API Routes usam NextAuth token validation. | FASE 1 |
| 9 | Cookies sem `HttpOnly`/`Secure` | NextAuth configura `HttpOnly`, `Secure`, `SameSite=Lax` automaticamente. | FASE 1 |
| 10 | Troca de senha sem senha atual | `changePassword()` exige validação bcrypt da senha atual. Unit test obrigatório para esta função. | FASE 1 |
| 11 | Log capturando SQLs com valores (código comentado) | `AuditLog` loga ações e metadados de negócio — nunca queries SQL brutas. | FASE 1 |

### 4.2 Bugs de Dados e Regra de Negócio

| # | Problema Legado | Mitigação Morpheus | Status |
|---|---|---|---|
| 12 | CPF como `cf_sql_numeric` — zeros perdidos | `String @db.Char(11)` + validação de 11 dígitos no Zod schema. | FASE 1 |
| 13 | Busca por nome usa `p_id%` (busca por ID) | `findMany` com `name: { contains: query, mode: "insensitive" }`. Testado com e2e. | FASE 1 |
| 14 | `f_set_sessao_planejada` nunca grava (incompleta) | `scheduleAppointment()` completa, com validação de escala E gravação. Unit tests. | FASE 1 |
| 15 | Anti-duplicata detecta só choque exato | Query de sobreposição de intervalo (Allen's Interval Algebra). | FASE 1 |
| 16 | Dropdown de hora exibe `:15` mas envia `:00` | FullCalendar `slotDuration=15min` + time picker com step 15min. | FASE 1 |
| 17 | E-mail de boleto com `subject="teste"` em produção | Templates de e-mail via React Email com Resend. Subject é variável tipada. | FASE 2 |
| 18 | `emissao_boletos.Lista` passa string como numérico | TypeScript + Prisma — tipos de parâmetros são validados em compile time. | FASE 1 |
| 19 | Agendamento exige exatamente 60 minutos | Sem restrição de duração. Mínimo de 15 minutos (1 slot de calendário). | FASE 1 |

### 4.3 Infraestrutura e Arquitetura

| # | Problema Legado | Mitigação Morpheus | Status |
|---|---|---|---|
| 20 | Paths Windows hardcoded (`D:\www\...`) | Nenhum arquivo em disco. Boletos no Stripe, imagens no Vercel Blob. | FASE 1/3 |
| 21 | Schema hardcoded `UPDATE renovopsicologia.tb_psicologas` | Prisma ORM — sem schema no SQL. Portável para qualquer banco. | FASE 1 |
| 22 | Versionamento por cópia de arquivo (`eventos_27_05_2017.cfc`) | Git com branches e tags. Zero cópias de arquivo como versionamento. | PROCESSO |
| 23 | Charset inconsistente (iso-8859-1 no admin, utf-8 no portal) | PostgreSQL UTF-8 por padrão. Next.js UTF-8 nativo. Sem conversão manual. | FASE 1 |
| 24 | UI admin em frameset HTML 4 | Next.js App Router com layouts aninhados. | FASE 1 |
| 25 | Arquivos de teste em produção (`teste.html`, `teste_boleto.cfm`) | CI/CD rejeita commits com arquivos `.test.html` fora de `__tests__/`. | PROCESSO |
| 26 | Referências ao sistema legado "Populis" em comentários | Code review + `grep` em CI bloqueando strings proibidas em produção. | PROCESSO |
| 27 | Typo em função: `Exlui_Usuarios` | TypeScript + ESLint + nomenclatura em inglês. Typos são detectados pelo compilador. | FASE 1 |
| 28 | CFC `usuarios.cfc` duplicada entre dois apps | Arquitetura monorepo com shared `lib/` — zero duplicação. | FASE 1 |
| 29 | jQuery 1.12 (EOL 2016), Bootstrap 3 (EOL 2019) | React 18 + Tailwind CSS. Dependências auditadas via `npm audit` no CI. | FASE 1 |

### 4.4 Conformidade LGPD

| # | Gap Legado | Mitigação Morpheus | Status |
|---|---|---|---|
| 30 | PII sem criptografia em repouso | Criptografia AES-256 via Prisma extension para campos sensíveis. | FASE 4 |
| 31 | Sem consentimento granular (só `aceita_receber_sms`) | Flags `consentSms`, `consentEmail`, `consentWhatsapp` no model `Client`. | FASE 1 |
| 32 | Sem exportação de dados do titular | Endpoint `/api/me/export` que gera ZIP com dados em JSON. | FASE 4 |
| 33 | Sem direito ao esquecimento (só soft-delete) | Fluxo de exclusão efetiva com anonimização após período de retenção. | FASE 4 |
| 34 | Logs não cobrem acesso a dados pessoais | `AuditLog` com `action: VIEW` em toda consulta a dados de cliente. | FASE 1 |
| 35 | Sem política de retenção (dados indefinidos) | Cron job de anonimização configurável por tenant. | FASE 4 |
| 36 | Sem registro de base legal para tratamento | Campo `legalBasis` no model de consentimento. | FASE 4 |

---

## 5. Glossário Morpheus × Legado

| Termo Legado | Equivalente Morpheus | Observação |
|---|---|---|
| `tb_usuarios` | `User` | Roles substituem grupos baseados em CSV |
| `tb_grupos` + `gru_co_permissao` (CSV) | `UserRole` (enum) | Permissões estruturadas, sem CSV de IDs |
| `tb_menu` | Não existe | Navegação é hardcoded no layout — profissionais de saúde não precisam customizar menus |
| `usu_co_matricula` | `passwordHash` | Bcrypt. O nome "matrícula" é eliminado. |
| `tb_psicologas` | `Psychologist` | Pode ter `userId` associado (login próprio) |
| `tb_psicologa_escala` | `PsychologistSchedule` | `dayOfWeek` em ISO (0=Dom), não o índice legado |
| `tb_clientes` | `Client` | CPF como `Char(11)` — nunca numérico |
| `tb_consultas` | `Appointment` | `startsAt`/`endsAt` unificados em DateTime UTC |
| `tb_consultas_status` | `AppointmentStatus` (enum) | SCHEDULED, COMPLETED, NO_SHOW, CANCELLED |
| `tb_salas` | `Room` | Com campo `color` para identificação no calendário |
| `tb_salas_agendamentos` | `RoomBooking` | Com detecção real de sobreposição |
| `tb_emissao_boletos` + `tb_boletos` | Stripe Invoice | Dados bancários no Stripe, nunca no banco |
| `tb_config_boleto` | Stripe Connected Account | Dados bancários gerenciados pelo Stripe |
| `tb_log` | `AuditLog` | Ativo, com cobertura de VIEW (LGPD) |
| `tb_parametros` (linha única) | Tenant config via UI | Sem linha mágica no banco |
| `tbpessoafisica` | Não existe | Tabela legada do sistema "Populis" — descontinuada |
| Aplicativo `/agendarenovo` | Dashboard com `UserRole.PSYCHOLOGIST` | Um único produto com papéis diferenciados |
| Aplicativo `/admin` | Dashboard com `UserRole.ADMIN` / `RECEPTIONIST` | Idem — sem dois sistemas separados |
| `par_tx_pathfisico` (path Windows) | Não existe | Zero armazenamento de arquivos em disco local |
| Gateway NAC Solution | Stripe | HTTPS, sem dados na URL, sem HTTP |
| `aceita_receber_sms` (não implementado) | `consentSms/Email/Whatsapp` | Implementado na FASE 2 via Evolution API + Resend |
| **CFC** (Centro de Formação de Condutores) | Módulo `CFC` — FASE FUTURA | Escopo fora do MVP. Pode ser um `type` adicional no `Tenant`. |

---

*Este documento é vivo. Nenhuma decisão arquitetural deve ser alterada sem revisão e aprovação do documento. O CHANGELOG.md deve ser atualizado ao final de cada fase concluída.*

---

**Morpheus** · `v1.0` · Engenharia de Produto  
*"Dar forma ao caos clínico, sem ruído."*
