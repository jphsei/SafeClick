# Testes — SafeClick

Testes unitários para o código puro/lógica do projeto. Não inclui
testes E2E nem testes que dependam da BD ou Supabase Auth — esses
ficam para uma fase posterior.

## Como correr

A partir de `frontend/`:

```bash
# Correr todos os testes uma vez (formato CI)
npm test

# Correr em modo watch (re-corre quando ficheiros mudam)
npm run test:watch

# Correr um ficheiro específico
npx vitest run tests/lib/auth/password.test.ts

# Correr testes que matchem por nome
npx vitest run -t "validatePassword"
```

## Estrutura

```
tests/
├── README.md                       (este ficheiro)
└── lib/                            (espelha frontend/src/lib/)
    ├── auth/
    │   ├── password.test.ts        (validação + força)
    │   └── otp-email.test.ts       (geração + hash + verify)
    └── relative-time.test.ts       (formatação "há X horas")
```

A regra para o caminho dos testes é: **espelha** a estrutura de
`src/`, mas dentro de `tests/`. Assim os testes do
`src/lib/auth/password.ts` vivem em `tests/lib/auth/password.test.ts`.

## Convenções

- Cada `describe` agrupa um nome exportado (função ou classe)
- Cada `it` descreve um comportamento concreto numa frase pt-PT
- Tempo determinístico via `vi.useFakeTimers()` + `vi.setSystemTime()`
  quando o teste depende de "agora"
- Usar `expect(...).toBe(...)` para comparações exactas e
  `expect(...).toMatch(/regex/i)` para padrões de texto

## O que vale a pena testar (e o que não)

**Boas escolhas para testes unitários:**

- Funções puras (input → output, sem efeitos colaterais)
- Validação de schemas (Zod)
- Utilities de formatação (datas, números, strings)
- Lógica de cálculo (scoring, sorting, filtros)
- Geração / hashing / parsing de tokens

**Más escolhas (para já):**

- Server Components (precisam de mock do Supabase + cookies)
- Server Actions (precisam de mock do Supabase + auth)
- Componentes React com integração de Supabase
- Tudo que envolva I/O (email, BD, fetch)

Estes ficam para uma fase de testes de integração — quando tivermos
um setup com `supabase-js` mockado ou um Supabase local dedicado
para testes.

## Adicionar um teste novo

1. Crie `tests/<espelha-o-caminho-de-src>.test.ts`
2. Importe a função a testar via `import { x } from '@/lib/...'`
3. Use `describe(...)` para agrupar e `it(...)` para cada caso
4. Corra `npm run test:watch` enquanto desenvolve
5. Antes de commit, corra `npm test` para confirmar que tudo passa

## Cobertura

Para gerar relatório de cobertura, instalar `@vitest/coverage-v8`:

```bash
npm i -D @vitest/coverage-v8
npx vitest run --coverage
```

A cobertura HTML fica em `coverage/index.html`.
