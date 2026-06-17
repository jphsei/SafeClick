# SafeClick — Frontend

Plataforma educacional de cibersegurança para escolas portuguesas (ensino básico e secundário). Os alunos completam módulos, fazem quizzes e simulações de phishing; os professores gerem turmas e atribuem conteúdos; os administradores gerem a plataforma. Toda a interface está em pt-PT.

Este `README` cobre só o frontend (Next.js). Para o schema da base de dados e migrações, ver `../supabase/`.

## Stack

- **Next.js 16** (App Router, Turbopack) com React 19 e TypeScript strict
- **Supabase** (Postgres + Auth + RLS) — local via Docker, prod no Supabase Cloud
- **`@supabase/ssr`** para integração SSR-friendly
- **Tailwind CSS 4** + componentes estilo shadcn (Radix UI: Dialog, AlertDialog, Popover)
- **Zod** para validação de inputs em server actions
- **`isomorphic-dompurify`** para sanitizar HTML (corpo dos emails de phishing)
- **nodemailer** para envio de OTP de 2FA (Inbucket em dev, SMTP real em prod)
- **Vitest** + `@testing-library/react` + `happy-dom` para testes unitários

## Setup local

### 1. Pré-requisitos

- Node.js 20+
- Docker Desktop (para correr o Supabase local)
- Supabase CLI: `npm i -g supabase` (ou `scoop install supabase`)

### 2. Variáveis de ambiente

Cria `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key local>
SUPABASE_SERVICE_ROLE_KEY=<service-role key local>

# SMTP (Inbucket em dev — http://127.0.0.1:54324)
SMTP_HOST=127.0.0.1
SMTP_PORT=54325
SMTP_FROM=noreply@safeclick.pt
```

As chaves Supabase locais aparecem no output de `supabase start`. Em produção, as chaves vêm do projecto Supabase Cloud.

### 3. Arrancar o Supabase local

A partir da raiz do repositório (`SafeClick/`, não `frontend/`):

```bash
supabase start
```

Isto arranca Postgres, Auth, REST, Studio e Inbucket. URLs típicos:

- API: `http://127.0.0.1:54321`
- Studio (UI da BD): `http://127.0.0.1:54323`
- Inbucket (apanha emails): `http://127.0.0.1:54324`

### 4. Aplicar migrações e seed

```bash
supabase db reset
```

Isto:

1. Recria a BD local do zero
2. Aplica todas as migrações em `supabase/migrations/` por ordem
3. Corre `supabase/seed.sql` para popular com dados de teste

### 5. Instalar dependências e arrancar o frontend

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:3000`. Cria conta no `/registo` para começar.

> **2FA por OTP**: todos os papéis (incluindo aluno) recebem código por email no login. Os emails de dev ficam no Inbucket (`http://127.0.0.1:54324`).

## Scripts disponíveis

| Script | O que faz |
|--------|-----------|
| `npm run dev` | Arranca o servidor dev com Turbopack |
| `npm run build` | Build de produção (corre type-check) |
| `npm start` | Corre o build de produção |
| `npm run lint` | ESLint |
| `npm run format` | Formata o código com Prettier |
| `npm run format:check` | Verifica formatação sem mudar ficheiros (uso em CI) |
| `npm test` | Corre todos os testes Vitest uma vez |
| `npm run test:watch` | Vitest em modo watch |
| `npm run db:types` | Regenera `src/lib/types/database.generated.ts` a partir do Supabase local |

## Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/               # login, registo, recuperar/redefinir password (público)
│   ├── (dashboard)/          # área autenticada (sidebar + header partilhados)
│   │   ├── admin/            # CRUD: escolas, utilizadores, modulos+aulas, configurações
│   │   ├── aluno/            # módulos, quizzes, simulações, badges, leaderboard
│   │   ├── professor/        # turmas, módulos atribuídos, recursos, relatórios
│   │   ├── perfil/           # editar próprio perfil
│   │   └── notificacoes/     # lista paginada
│   ├── api/auth/             # login (com 2FA OTP) + verify-otp
│   └── auth/callback/        # callback OAuth + recovery flow guard
├── components/
│   ├── ui/                   # shadcn-like (button, card, input, dialog, alert-dialog, popover)
│   ├── layout/               # sidebar, header, notifications-popover
│   └── auth/                 # password-strength
├── lib/
│   ├── auth/                 # require-role, admin-action, password, otp-email, rate-limiter
│   ├── supabase/             # client (browser), server (RSC), admin (service-role), middleware
│   ├── types/                # database.generated.ts (auto) + database.types.ts (aliases)
│   ├── sanitize.ts           # DOMPurify wrapper
│   ├── health-check.ts       # checks BD + Auth para /admin
│   ├── platform-info.ts      # versão + count de migrações
│   └── relative-time.ts      # "há 2 horas" em pt-PT
└── proxy.ts                  # Middleware Next.js (auth + recovery flow guard)

tests/                        # Vitest — espelha src/lib/
```

## Convenções

- **Server Components por defeito.** Só adicionar `'use client'` quando se precisa de estado, eventos do browser ou hooks (e nesse caso mantê-los pequenos).
- **Server Actions para mutações.** Nada de API routes (a única excepção é `/api/auth/login` e `/api/auth/verify-otp`, que precisam de aceder a cookies da sessão).
- **RLS em todas as tabelas.** O cliente nunca confia em si próprio para autorização. Lógica sensível (scoring, atribuição de pontos, validação de respostas) corre em RPCs Postgres com `SECURITY DEFINER`.
- **Helpers de auth** (`lib/auth/require-role.ts`): usar `requireUser()`, `requireRole(papel)` ou `requireProfile<T>(fields)` em vez de repetir o boilerplate de `getUser()` + redirect.
- **Helper `adminAction`** (`lib/auth/admin-action.ts`): para Server Actions de admin, combina `requireRole('administrador')` + Zod + erro padronizado.
- **Validação de password** (`lib/auth/password.ts`): fonte única de verdade. Aplica-se ao registo e ao reset.
- **AlertDialog** (`components/ui/alert-dialog.tsx`) para confirmações destrutivas (não usar `window.confirm()` nativo).
- **`router.refresh()`** após mutações (não `window.location.reload`).
- **Soft delete** via `ativo = false` (ou `estado = 'arquivado'` para módulos). Para utilizadores, soft delete também usa `auth.admin.updateUserById` com `ban_duration` para impedir login.

## Segurança

- 2FA por email OTP universal (todos os papéis)
- Rate limiting persistente em Postgres (5 tentativas/janela de 5 min, lockout de 15 min)
- HTTP security headers em `next.config.ts` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- `import 'server-only'` no `admin.ts` para impedir uso acidental do service-role no browser
- Sanitização de HTML para emails de phishing renderizados (DOMPurify)
- Cookie sentinel para impedir o link de "Esqueci a password" funcionar como bypass de login

## Testes

```bash
npm test            # todos os testes uma vez
npm run test:watch  # modo watch
```

Convenções e o que vale a pena testar estão em [`tests/README.md`](./tests/README.md).
