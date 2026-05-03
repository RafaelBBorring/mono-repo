# Morpheus - Arquitetura FASE 1

## 🏗️ Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser / Cliente                         │
│         (Next.js App Router - Client Components)            │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/HTTPS
┌───────────────────────▼─────────────────────────────────────┐
│              Next.js 14 Server (App Router)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Routes & Pages                          │  │
│  │  ├─ / (landing page - public)                        │  │
│  │  ├─ /login (auth form)                              │  │
│  │  ├─ /register (signup)                              │  │
│  │  └─ /dashboard/* (protected by middleware)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            API Routes (Next.js)                      │  │
│  │  ├─ POST /api/auth/register (new tenant)            │  │
│  │  ├─ POST /api/auth/[...nextauth] (login/logout)    │  │
│  │  ├─ GET/POST /api/rooms                            │  │
│  │  ├─ GET/POST /api/psychologists                    │  │
│  │  ├─ GET/POST /api/clients                          │  │
│  │  └─ GET/POST /api/appointments                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Authentication (NextAuth.js)               │  │
│  │  ├─ Credentials Provider (email + password)         │  │
│  │  ├─ bcryptjs (hash & compare)                       │  │
│  │  ├─ JWT with refresh tokens                         │  │
│  │  └─ Session management (stateless)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Middleware (Route Protection)               │  │
│  │  ├─ /dashboard/* → Protected                        │  │
│  │  ├─ /api/protected/* → Protected                    │  │
│  │  └─ /login, /register → Redirect if authenticated  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Business Logic (Services)                   │  │
│  │  ├─ appointmentService (validação + conflito)       │  │
│  │  ├─ roomBookingService (reservas sem choque)        │  │
│  │  ├─ validators (CPF, etc)                           │  │
│  │  └─ context helpers (getTenantId, getUser)         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────┬───────────────────────────────────┬──────────┘
               │                                   │
               │ Prisma Client (ORM)              │ NextAuth Session
               │                                   │
┌──────────────▼──────────────┐  ┌─────────────────▼─────────┐
│   PostgreSQL Database       │  │   Session Store            │
├─────────────────────────────┤  │   (Database / JWT)         │
│                             │  └────────────────────────────┘
│  Tenant (multi-tenancy)     │
│  ├─ User                    │
│  ├─ Psychologist            │
│  ├─ Client                  │
│  ├─ Appointment             │
│  ├─ Room                    │
│  ├─ RoomBooking             │
│  └─ AuditLog                │
│                             │
└─────────────────────────────┘
```

## 📊 Data Flow - User Registration

```
┌─────────────────┐
│   User (UI)     │
│  Preenche form  │
└────────┬────────┘
         │
         ▼
    /register
┌─────────────────────────────────┐
│ POST /api/auth/register         │
├─────────────────────────────────┤
│ 1. Parse + Validate (Zod)       │
│ 2. Check email unique            │
│ 3. Generate slug from clinic     │
│ 4. Hash password (bcrypt)        │
│ 5. Create Tenant + User (Tx)     │
│ 6. Return 201                    │
└────────┬────────────────────────┘
         │
         ▼
   /login
┌─────────────────────────────────┐
│  Sign In with Credentials       │
├─────────────────────────────────┤
│ 1. Email + Password             │
│ 2. Verify hash                  │
│ 3. Create JWT                   │
│ 4. Set session cookie           │
│ 5. Redirect to /dashboard       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   /dashboard (Protected)        │
│  ✅ Session valid               │
│  ✅ Render page                 │
└─────────────────────────────────┘
```

## 📊 Data Flow - Create Appointment

```
┌──────────────────┐
│  Receptionist    │
│  Selects times   │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  POST /api/appointments                     │
├─────────────────────────────────────────────┤
│ 1. Extract tenantId from session            │
│ 2. Validate input (Zod schema)              │
│ 3. Check psychologist schedule              │
│ 4. Check for conflicts (interval overlap)   │
│ 5. Create appointment with Prisma           │
│ 6. Log audit event                          │
│ 7. Return 201 + appointment data            │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  Database (Prisma)                          │
├─────────────────────────────────────────────┤
│ INSERT Appointment {                        │
│   id, tenantId, psychologistId, clientId,   │
│   startsAt, endsAt, value, status,          │
│   paymentStatus, createdAt                  │
│ }                                           │
│                                             │
│ INSERT AuditLog {                           │
│   tenantId, userId, action: "CREATE",       │
│   entity: "Appointment", ...                │
│ }                                           │
└──────────────────────────────────────────────┘
```

## 🔄 Multi-tenancy Flow

```
┌──────────────────────────────────────────────────────┐
│         Single PostgreSQL Database                   │
└──────────────────────────────────────────────────────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
      Tenant A       Tenant B    Tenant C
   (clinica-a)   (clinica-b)  (clinica-c)
            │            │            │
      ┌─────────┐  ┌─────────┐  ┌─────────┐
      │ Users   │  │ Users   │  │ Users   │
      │ Rooms   │  │ Rooms   │  │ Rooms   │
      │ Clients │  │ Clients │  │ Clients │
      └─────────┘  └─────────┘  └─────────┘

Isolamento por tenantId em TODAS as queries:
├─ WHERE tenantId = 'tenant-a-id'
├─ WHERE tenantId = 'tenant-b-id'
└─ WHERE tenantId = 'tenant-c-id'

Cross-tenant data leak: IMPOSSÍVEL
└─ Middleware valida tenantId no JWT
└─ Prisma queries obrigatoriamente filtram tenantId
```

## 🗄️ Schema Database Simplificado

```
┌──────────────────────────────────────────────────────────┐
│ TENANT (1 por organização)                               │
├──────────────────────────────────────────────────────────┤
│ id, name, slug*, plan, planExpiresAt, active, dates    │
└──────────────────────────────────────────────────────────┘
         │
         ├─────────────────────┬────────────────┬──────────────┐
         │                     │                │              │
         ▼                     ▼                ▼              ▼
    ┌─────────┐         ┌──────────┐    ┌────────────┐  ┌──────────┐
    │  USER   │         │  ROOM    │    │PSYCHOLOGIST│  │ CLIENT   │
    │(1:N)    │         │(1:N)     │    │(1:N)       │  │(1:N)     │
    └─────────┘         └──────────┘    └────────────┘  └──────────┘
         │                   │                │              │
         │                   ▼                ▼              │
         │              ┌──────────────┐    ┌────────────┐  │
         │              │ ROOMBOOKING  │    │ SCHEDULE   │  │
         │              │ (booking de  │    │(escala semanal)
         │              │  sala)       │    │            │  │
         │              └──────────────┘    └────────────┘  │
         │                                                  │
         └──────────────────────┬──────────────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  APPOINTMENT     │
                        │ (consulta clínica)
                        │ references:      │
                        │ - psychologist   │
                        │ - client         │
                        │ - status + value │
                        └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │   AUDITLOG       │
                        │ (compliance LGPD)│
                        │ - action: CREATE │
                        │ - entity + id    │
                        │ - metadata/diff  │
                        └──────────────────┘
```

## 🔐 Security Layers

```
┌─────────────────────────────────────────┐
│  Layer 1: HTTP/Transport Security       │
├─────────────────────────────────────────┤
│  ✅ HTTPS ready (configured in prod)    │
│  ✅ Cookie HttpOnly + Secure flags     │
│  ✅ CORS configured per Next.js         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Layer 2: Authentication                │
├─────────────────────────────────────────┤
│  ✅ Email + Password (credentials)      │
│  ✅ bcryptjs hash (cost 12)              │
│  ✅ JWT with expiration                 │
│  ✅ Refresh token rotation              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Layer 3: Authorization                 │
├─────────────────────────────────────────┤
│  ✅ Role-based (ADMIN, RECEPTIONIST...) │
│  ✅ Middleware protects routes          │
│  ✅ Resource-level tenantId check       │
│  ✅ User visibility controls            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Layer 4: Data Protection               │
├─────────────────────────────────────────┤
│  ✅ SQL injection: Prisma parametrized │
│  ✅ Validation: Zod schemas             │
│  ✅ Auditoria: AuditLog automático      │
│  ✅ Soft deletes: active = false        │
└─────────────────────────────────────────┘
```

## 📈 API Response Pattern

```typescript
// Success
{
  status: 201,
  data: {
    id: "cuid...",
    tenantId: "...",
    // ... entity fields
    createdAt: "2026-05-02T..."
  }
}

// Error
{
  status: 400|409|500,
  error: "User-friendly message",
  details: {
    // Optional: field-level errors
  }
}
```

## 🚀 Deployment Architecture (Future)

```
┌──────────────────────────────────────────────────────┐
│           Vercel (Frontend)                          │
│  ├─ Next.js App Router (SSR)                         │
│  ├─ API Routes                                       │
│  └─ Automatic deployments from Git                  │
└────────────────┬─────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   PostgreSQL        External Services
   Railway/Neon     ├─ Stripe (FASE 3)
                    ├─ Resend Email (FASE 2)
                    ├─ Evolution API WhatsApp (FASE 2)
                    └─ Auth.js (NextAuth)
```

---

**Documento criado**: 02/05/2026  
**Versão**: 1.0.0
