# AGENTS.md — BeatStage

Contexto do projeto para agentes de IA (e para quem retomar o trabalho depois).
Leia isto antes de mexer no código.

## Visão geral

Sistema de gestão para bandas: repertório, eventos, ensaios, equipamentos, agenda,
feedbacks, e um **modo palco ao vivo** que sincroniza a banda em tempo real (música
atual, contador, letra e notificações).

Interface e mensagens de erro em **português (pt-BR)**. Código em inglês/português
misturado — siga o padrão do arquivo que estiver editando.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 5.9, React Router 7, TanStack Query 5, CSS puro (sem Tailwind) |
| Backend | Express 5, TypeScript 7, Prisma 6, Zod 4, JWT (jsonwebtoken), bcryptjs |
| Banco | PostgreSQL 14+ — **porta 5433**, base `BeatStage`, usuário `postgres` sem senha |
| Execução | `tsx watch` no dev, `tsc` + `node dist/server.js` em produção |

## Como rodar

```bash
# da raiz do projeto
npm run dev:backend    # API em http://localhost:3000
npm run dev:frontend   # Vite em http://localhost:5173
npm run build          # build do frontend (roda tsc --noEmit antes)
npm run build:backend  # build da API
npm run seed           # dados de demonstração (precisa da API no ar)
```

Scripts equivalentes dentro de cada pasta: `npm run dev`, `npm run build`,
`npm start` (backend), `npm run typecheck` (frontend).

O Vite faz proxy de `/api` para `http://localhost:3000`. Não há CORS nem mock a
configurar no frontend.

## Banco de dados

- `backend/.env` define `DATABASE_URL`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`.
  O arquivo tem **BOM UTF-8** no início — cuidado ao reescrevê-lo.
- A pasta `.devdb/` na raiz guarda os dados do PostgreSQL. **A pasta vizinha
  `Beatstage - Copia` aponta para este mesmo banco** (o `postmaster.pid` pertence a
  este diretório). Mexer no schema afeta as duas.
- As tabelas foram criadas com `prisma db push`, então **`prisma migrate status`
  reporta migrações não aplicadas** mesmo com tudo funcionando. Se
  `npx prisma migrate deploy` reclamar de "relation already exists", use
  `npx prisma db push`.
- 14 modelos: `Musico, Banda, MembroBanda, Equipamento, Ensaio, Evento,
  EventoRepertorio, EventoEquipamento, Repertorio, RepertorioMusico, Agenda,
  Feedback, LiveSessao, Notificacao`.

## Mapa do código

### Backend (`backend/src/`)

Arquitetura em camadas, sempre nessa ordem:
`routes.ts → controller → service → prisma`

- `routes.ts` — todas as rotas, com `autenticar` + `autorizar` por rota.
- `middlewares/` — `authMiddleware` (JWT), `authorizationMiddleware` (papel na banda),
  `validateMiddleware` (Zod), `errorMiddleware`.
- `schemas/` — validação Zod; um arquivo por domínio.
- `errors/AppError.ts` — erros de negócio; o `errorMiddleware` converte em resposta HTTP.
- `lib/prisma.ts` — instância única do PrismaClient.
- `services/acessoBandaService.ts` — checagem de permissão por banda. **Use este
  serviço em vez de reimplementar checagem de acesso.**

### Modo ao vivo (o subsistema mais delicado)

| Arquivo | Papel |
|---|---|
| `backend/src/lib/liveBus.ts` | Pub/sub em memória (EventEmitter) dos eventos ao vivo |
| `backend/src/services/aoVivoService.ts` | Estado da sessão, avanço de música, `notificarEntradaNaMusica`, `cutucarNoAoVivo` |
| `backend/src/services/notificacaoService.ts` | Cria e lista notificações |
| `backend/src/controllers/aoVivoController.ts` | Rotas do palco |
| `backend/src/controllers/notificacaoController.ts` | Rotas de notificação |

Rotas: `GET /ao-vivo/:idEvento`, `GET /ao-vivo/:idEvento/stream`,
`PATCH /ao-vivo/:idEvento`, `POST /ao-vivo/:idEvento/cutucar`,
`GET /notificacoes`, `GET /notificacoes/stream`, `POST /notificacoes/lidas`,
`PATCH /notificacoes/:id/lida`.

### Frontend (`frontend/src/`)

- `pages/LiveModePage.tsx` — tela do palco: SSE, contador (`live-timer`), letra
  (`live-lyrics`), `CutucarModal`, `LiveEventPicker`.
- `lib/stream.ts` — SSE via `fetch` + `Authorization: Bearer`.
  **Não troque por `EventSource`**: ele não aceita header de autorização.
- `services/letras.service.ts` — letra via **lyrics.ovh** (gratuita), com cache e
  fallback para `/suggest`.
- `services/*.service.ts` — um por domínio, todos usam `lib/api.ts`.
- `contexts/` — `AuthContext`, `ToastContext`, `ConfirmContext`,
  `NotificationStreamContext` (conecta no stream de notificações).
- `lib/browserNotifications.ts` — notificação do sistema operacional.
- `styles/` — CSS puro (`pages.css`, `components.css`).
- `components/ui/StatCard.tsx` — recebe `to` e vira `<Link>`; é o que deixa os cards
  do dashboard clicáveis.

## Dados de demonstração

```bash
npm run seed   # scripts/seed-demo.mjs — usa a API real, não escreve no banco direto
```

- Líder: `manoel@beatstage.demo` / `demo12345`
- Banda: Aurora Elétrica — convite `URL73BDP`
- 4 integrantes, 8 músicas, 5 equipamentos, 3 ensaios, 3 eventos

Uso local apenas.

## Verificação

**Não existe suíte de testes automatizada** (`npm test` no backend é um placeholder
que retorna erro de propósito). `playwright-core` está instalado no frontend, mas
nenhum teste está escrito.

Antes de dar algo como pronto:

```bash
cd frontend && npm run typecheck    # tsc --noEmit
cd backend  && npx tsc -p tsconfig.json --noEmit
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/eventos   # 401 = ok
```

## Armadilhas conhecidas

1. **`CURL_CA_BUNDLE` quebrado nesta máquina.** A variável aponta para
   `C:\Program Files\PostgreSQL\18\ssl\certs\ca-bundle.crt`, que não existe, e faz
   `pip`/`npm` falharem com erro de certificado. Contorno:
   `env -u CURL_CA_BUNDLE <comando>` ou `unset CURL_CA_BUNDLE`.
2. **Porta 3000 ocupada.** Rodar backend daqui e da pasta `Beatstage - Copia` ao
   mesmo tempo dá `EADDRINUSE`. Confira antes com
   `netstat -ano | grep :3000`.
3. **Porta do Vite é fixa.** `vite.config.ts` usa `strictPort: true` na 5173: se já
   houver um Vite rodando, sobe com erro em vez de escolher outra porta. O proxy
   `/api` → `http://localhost:3000` (ou `VITE_PROXY_TARGET`) é o que faz o frontend
   falar com a API em dev — vale conferir esse arquivo antes de suspeitar de CORS.
4. **O barramento do ao vivo é em memória.** `lib/liveBus.ts` é um EventEmitter:
   reiniciar o backend derruba as conexões SSE abertas e os clientes precisam
   reconectar. O estado da sessão em si **é persistido** no model `LiveSessao`
   (status, repertório atual, `iniciadoEm`, `musicaIniciadaEm`), então o show não
   se perde — só o canal em tempo real.
5. **Letra não encontrada** costuma ser nome de música/artista diferente do
   original — o campo `artista` no repertório precisa estar preenchido.
6. Existe uma cópia do projeto em `C:\ProjetoIntegrador\Beatstage - Copia` com o
   **mesmo código**. Se for editar, edite aqui; não duplique correções.

## Regras para agentes

- Não faça commit nem push sem o usuário pedir explicitamente.
- Não rode dois backends ao mesmo tempo (mesma porta e mesmo banco).
- Siga as camadas `routes → controller → service`; não coloque regra de negócio em
  controller nem SQL solto em service.
- Mudou schema do Prisma? Rode `npx prisma generate` e depois `npx prisma db push`.
- Documentação para usuário final: `Passo a passo - Rodar o BeatStage.docx` / `.pdf`
  na raiz. Se mexer em portas, comandos ou credenciais, atualize os dois.
