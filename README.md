# BeatStage

Frontend completo do BeatStage, integrado ao backend Express/Prisma existente e validado com dados reais persistidos em PostgreSQL.

O BeatStage centraliza a rotina de bandas: autenticação, bandas e integrantes, repertório com tom/duração/funções, agenda, ensaios, eventos com setlist e equipamentos, feedbacks e um modo ao vivo para acompanhar o show.

![Dashboard do BeatStage](refs/screens/02-dashboard.png)

---

## 1. Stack e organização

### Frontend

| Tecnologia | Uso |
|---|---|
| React 19 + TypeScript | Interface e tipagem dos contratos da API |
| Vite 8 | Servidor de desenvolvimento, proxy e build de produção |
| React Router 7 | Rotas públicas, protegidas e layout persistente |
| TanStack Query 5 | Cache, carregamento, refetch e invalidação por módulo |
| CSS próprio com design tokens | Tema escuro, tela de autenticação clara e responsividade |
| lucide-react | Ícones consistentes |
| Sora + Manrope (fontsource) | Tipografia local, sem dependência de CDN |
| Utilitários próprios | Datas, durações e cálculos de agenda |

### Backend (preservado)

- Node.js + Express 5
- TypeScript
- Prisma ORM 6 + PostgreSQL
- JWT (HS256) + bcryptjs
- Zod para validação
- Exclusão lógica (`ativo = false`)

### Estrutura

```
BeatStage/
├── backend/                     # backend existente + ajustes mínimos documentados
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/          # inclui a migration de duração do repertório
│   └── src/
│       ├── controllers/
│       ├── services/
│       ├── schemas/
│       ├── middlewares/
│       └── routes.ts
├── frontend/
│   ├── src/
│   │   ├── assets/              # imagem de palco gerada para a autenticação
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, Topbar, AppLayout
│   │   │   └── ui/              # Button, Field, Modal, Badge, Avatar...
│   │   ├── contexts/            # Auth, Toast, Confirm
│   │   ├── hooks/               # queries por módulo e chaves de cache
│   │   ├── lib/                 # cliente HTTP, formatadores, permissões
│   │   ├── pages/               # uma página por módulo + modais de formulário
│   │   ├── services/            # um serviço por recurso da API
│   │   ├── styles/              # tokens, base, componentes e páginas
│   │   ├── types/               # contratos TypeScript da API
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── scripts/                 # verificações de UI usadas no desenvolvimento
├── scripts/
│   └── seed-demo.mjs            # cria dados reais via API para demonstração
├── README.md
└── package.json                 # atalhos para rodar cada lado
```

### Telas implementadas

| Rota | Tela |
|---|---|
| `/login` e `/cadastro` | Autenticação em duas colunas, com hero escuro e formulário claro |
| `/inicio` | Dashboard com próximos compromissos, indicadores, bandas e últimos comentários |
| `/agenda` | Lista e calendário mensal, filtros, conclusão, criação/edição/exclusão |
| `/bandas` | Lista de bandas, criação e entrada por código de convite |
| `/bandas/:id` | Detalhes, integrantes, convite, atalhos, transferência de liderança |
| `/repertorio` | Músicas, tom, duração, observações, músicos/funções e total estimado |
| `/eventos` | Cards de apresentações e gestão |
| `/eventos/:id` | Detalhe com setlist, equipamentos, duração e atalho para o modo ao vivo |
| `/ensaios` | Lista e gestão de ensaios |
| `/equipamentos` | Inventário, estado próprio/emprestado e responsável |
| `/feedback` | Mural, envio identificado/anônimo e moderação |
| `/perfil` | Dados pessoais, senha e inativação da conta |
| `/ao-vivo` e `/ao-vivo/:id` | Seletor de evento e setlist ao vivo |
| `*` | Página 404 |

---

## 2. Como executar

### Pré-requisitos

- Node.js 20+ (validado com Node 24)
- PostgreSQL 14+ (validado com PostgreSQL 18)
- npm

### 1) Banco de dados

Crie um banco vazio:

```sql
CREATE DATABASE "BeatStage";
```

### 2) Backend

```bash
cd backend
cp .env.example .env        # no Windows: copy .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Conteúdo esperado do `.env` (não versionar):

```dotenv
DATABASE_URL="postgresql://usuario:senha@localhost:5432/BeatStage?schema=public"
PORT=3000
JWT_SECRET="um-segredo-aleatorio-com-no-minimo-32-caracteres"
JWT_EXPIRES_IN="1h"
```

Para gerar um segredo local:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

A API sobe em `http://localhost:3000/api`.

> O backend usa CORS aberto para desenvolvimento. O frontend consome `/api` por meio do proxy do Vite, então não é necessário configurar uma segunda API nem um mock.

### 3) Frontend

Em outro terminal:

```bash
cd frontend
cp .env.example .env        # no Windows: copy .env.example .env
npm install
npm run dev
```

Acesse `http://localhost:5173`.

Variáveis:

```dotenv
VITE_API_URL=/api
VITE_PROXY_TARGET=http://localhost:3000
```

- Em desenvolvimento, `/api` é encaminhado ao backend pelo Vite.
- Em produção, gere o build com `npm run build` e sirva `frontend/dist`. Se o frontend e a API estiverem em origens diferentes, defina `VITE_API_URL=https://sua-api/api` no build e libere CORS no backend.

### 4) Dados de demonstração (opcional)

Com o backend e o banco já preparados:

```bash
npm run seed
```

O script cria dados **pela API real** (não injeta registros no banco):

- líder: `manoel@beatstage.demo` / `demo12345`
- banda: **Aurora Elétrica** — código de convite `URL73BDP`
- 4 integrantes, 8 músicas com tom/duração/funções, 5 equipamentos, 3 ensaios, 3 eventos, atividades de agenda e 3 feedbacks (um anônimo)

> Essas credenciais são exclusivas de desenvolvimento local. Não use em produção.

### Atalhos na raiz

```bash
npm run dev:backend
npm run dev:frontend
npm run build
npm run seed
```

---

## 3. Integração frontend ↔ backend

### Cliente HTTP único

`frontend/src/lib/api.ts` centraliza:

- URL base (`VITE_API_URL`, padrão `/api`);
- `Content-Type: application/json`;
- token `Authorization: Bearer <jwt>`;
- leitura do JSON de erro `{ mensagem, erros: [{ campo, mensagem }] }`;
- erros de rede com mensagem amigável;
- disparo de evento global em `401`, encerrando a sessão e limpando o cache.

### Serviços por módulo

`frontend/src/services/` contém um serviço por recurso:

`auth`, `musicos`, `bandas`, `repertorios`, `eventos`, `ensaios`, `equipamentos`, `agendas`, `feedbacks`.

Nenhuma tela usa dados fictícios: todas as listas e operações chamam os endpoints reais.

### Sessão e autenticação

- O login retorna o JWT e os dados básicos do músico.
- O token é mantido em `localStorage` e o perfil é revalidado em `GET /musicos/perfil` a cada abertura.
- Rotas privadas usam `ProtectedRoute`; `/login` e `/cadastro` usam `PublicOnlyRoute`.
- Um `401` limpa a sessão e redireciona para o login.
- A identidade do usuário nunca é enviada pelo frontend para autorizar operações: o backend sempre extrai o músico do token.

### Cache e atualização das listagens

TanStack Query mantém as chaves `bandas`, `musicos`, `repertorios`, `eventos`, `ensaios`, `equipamentos`, `agendas` e `feedbacks`. Cada mutação invalida as chaves afetadas. Exclusões encadeadas (banda) invalidam o cache inteiro, porque a API inativa em cascata equipamentos, ensaios, eventos, repertórios, agendas e feedbacks.

### Permissões na interface

O papel é derivado por banda (`idLider === usuário`). As ações de gestão aparecem apenas para o líder daquela banda. A validação real continua no backend: por exemplo, tentar criar um evento como integrante retorna `403` mesmo que a requisição seja feita fora da interface.

### Datas

O backend serializa colunas `DATE` como ISO com horário (`AAAA-MM-DDTHH:mm:ss.sssZ`). O frontend lê somente a parte `AAAA-MM-DD` e monta a data em horário local, evitando deslocamento de um dia por fuso.

---

## 4. Endpoints utilizados

### Autenticação e perfil

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/auth/login` | Login e emissão do JWT |
| POST | `/musicos` | Cadastro de conta |
| GET | `/musicos/perfil` | Validação da sessão / dados do perfil |
| PATCH | `/musicos/perfil` | Edição de nome, e-mail, cargo e foto |
| PATCH | `/musicos/perfil/senha` | Troca de senha |
| DELETE | `/musicos/:id` | Inativação lógica do próprio perfil |
| GET | `/musicos` | Lista de músicos para convites e autoria de feedback |

### Bandas

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/bandas` | Bandas do usuário |
| POST | `/bandas` | Criação; o líder é o usuário autenticado |
| GET | `/bandas/:id` | Detalhe |
| PATCH | `/bandas/:id` | Nome/descrição, membros e liderança (somente líder) |
| DELETE | `/bandas/:id` | Exclusão lógica em cascata (somente líder) |
| **POST** | **`/bandas/entrar`** | **Entrada por código de convite (adição mínima ao backend — ver seção 5)** |

### Repertório

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/repertorios` | Lista das bandas do usuário |
| POST | `/repertorios` | Criação com tom, duração, observação e músicos/funções |
| GET | `/repertorios/:id` | Consulta |
| PATCH | `/repertorios/:id` | Edição |
| DELETE | `/repertorios/:id` | Exclusão lógica |

### Eventos, ensaios e equipamentos

| Método | Endpoints |
|---|---|
| CRUD | `/eventos`, `/eventos/:id` |
| CRUD | `/ensaios`, `/ensaios/:id` |
| CRUD | `/equipamentos`, `/equipamentos/:id` |

### Agenda e feedback

| Método | Endpoints |
|---|---|
| CRUD | `/agendas`, `/agendas/:id` |
| CRUD | `/feedbacks`, `/feedbacks/:id` |

Todos os endpoints acima exigem `Authorization: Bearer <token>`, exceto `POST /musicos` e `POST /auth/login`.

---

## 5. Ajustes mínimos no backend (justificados)

O backend existente foi preservado. Duas necessidades funcionais não tinham suporte no contrato original:

### 5.1. Entrada em banda por código de convite

O diagrama de classes descreve `entrarBanda(codigo)`, mas as rotas existentes só permitiam ao líder alterar a lista de membros. Não havia como um músico entrar sozinho.

Foi adicionada uma única rota:

```http
POST /api/bandas/entrar
Authorization: Bearer <jwt>
Content-Type: application/json

{ "codigoConvite": "URL73BDP" }
```

Regras:

- exige autenticação;
- busca banda **ativa** pelo código (comparação sem diferenciar maiúsculas/minúsculas);
- impede que o próprio líder "entre" na banda;
- impede duplicidade de participação;
- cria o vínculo em `Banda_Membro`;
- retorna `{ mensagem, banda }`.

Arquivos alterados: `bandaSchema.ts`, `bandaService.ts`, `bandaController.ts`, `routes.ts`.

### 5.2. Duração do repertório (RF25)

O requisito RF25 pede o cálculo da duração total, mas o modelo não possuía nenhum campo de duração. Foi adicionado um campo **opcional**:

```prisma
model Repertorio {
  // ...
  duracaoSegundos Int?
}
```

- Migration: `backend/prisma/migrations/20261110000000_adicionar_duracao_repertorio/migration.sql`
- Validação Zod: inteiro entre 1 e 7200 segundos.
- O campo é opcional; registros antigos continuam válidos.
- O frontend exibe `mm:ss` por música e calcula o total no repertório, no evento e no modo ao vivo.
- Músicas sem duração não entram na soma; a interface informa quantas músicas possuem duração cadastrada.

Nenhum relacionamento, regra de autorização ou outro campo existente foi alterado.

---

## 6. Funcionalidades implementadas

### Autenticação e conta
- Login com validação e feedback de erro.
- Cadastro com nome, e-mail, função musical, foto opcional (URL) e confirmação de senha.
- Sessão persistente com revalidação do perfil.
- Edição de perfil.
- Troca de senha com validação da senha atual.
- Inativação lógica com bloqueio de novo login e tratamento do conflito quando o usuário lidera banda ativa.
- Logout e limpeza do cache.

### Dashboard
- Saudação e data atual.
- Próximo compromisso com data, horário e local quando disponíveis.
- Próximos compromissos consolidando agenda, ensaios e eventos.
- Indicadores reais: músicas, próximos eventos e ensaios.
- Bandas do usuário, integrantes e últimos feedbacks.

### Bandas e membros
- Listagem, busca e detalhe.
- Criação com código de convite automático.
- Edição e exclusão pelo líder.
- Entrada por código de convite.
- Inclusão e remoção de integrantes.
- Transferência de liderança.
- Código de convite visível apenas ao líder.
- Identificação do papel do usuário em cada banda.

### Repertório
- CRUD por banda.
- Tom padronizado conforme `TomMusical`.
- Duração opcional e total estimado.
- Observações.
- Associação de músicos da banda com função por música.
- Busca e filtros por banda/tom.

### Agenda
- Lista e calendário mensal.
- Criação individual ou de banda (banda somente pelo líder).
- Vínculo opcional com evento.
- Edição, conclusão/reabertura e exclusão.
- Filtros por situação, tipo e banda.
- Distinção visual entre atividade individual e compartilhada.

### Ensaios
- CRUD de ensaios com data, local e pauta.
- Filtros por banda e situação.
- Integração visual com o dashboard e os avisos do topo.

### Eventos
- CRUD de apresentações.
- Associação de repertório e equipamentos da mesma banda.
- Cards com status derivado da data (agendado, próximo, realizado).
- Detalhe com setlist, tom, duração, músicos, equipamentos e total.
- Atalho para o modo ao vivo.

### Equipamentos
- CRUD.
- Estado `PROPRIO`/`EMPRESTADO`.
- Responsável e descrição.
- Filtros por banda, estado e busca.

### Feedback
- Envio identificado ou anônimo por banda.
- Mural com filtro por banda.
- Edição/exclusão pelo autor identificado ou pelo líder.
- Indicação visual de anonimato.

### Modo ao vivo
- Seleção de evento.
- Música atual, próxima música e setlist completo.
- Tom, duração e músicos/funções (entradas) por música.
- Controles de anterior/próxima/concluir.
- Progresso e duração tocada/restante.
- Estado salvo no dispositivo por evento (sobrevive a recarregar a página).
- Atalhos de teclado (`←`/`→`).
- Tela cheia.
- Aviso explícito sobre o limite de sincronização entre dispositivos.

### Experiência transversal
- Layout responsivo com sidebar em drawer no celular.
- Tabelas transformadas em cards no celular.
- Estados de carregamento, vazio e erro.
- Mensagens de sucesso/erro.
- Confirmação antes de exclusões.
- Foco preso no modal, fechamento por `Esc`, bloqueio de scroll.
- Componentes reutilizáveis e CSS com tokens.

---

## 7. Controle de acesso

| Operação | Músico | Líder da banda |
|---|---|---|
| Consultar bandas, repertório, agenda, eventos, ensaios e equipamentos | Sim | Sim |
| Criar/editar/excluir banda | Não | Sim |
| Adicionar/remover integrantes e transferir liderança | Não | Sim |
| Criar/editar/excluir repertório | Não | Sim |
| Criar/editar/excluir eventos, ensaios e equipamentos | Não | Sim |
| Criar atividade individual na agenda | Sim | Sim |
| Criar/editar/excluir atividade de banda | Não | Sim |
| Enviar feedback | Sim | Sim |
| Editar/excluir feedback identificado | Próprio autor | Autor ou líder |
| Editar/excluir feedback anônimo | Não exibido na UI* | Sim |

\* O backend devolve `idMusico: null` para feedbacks anônimos, inclusive para o autor. O líder consegue moderar porque é identificado pelo vínculo com a banda. Essa limitação de contrato está registrada na seção 9.

A interface esconde ações não autorizadas, mas a proteção efetiva é feita pelo backend (`exigirLiderDaBanda`, `buscarBandaDoMusico`, `autorizarMusicoProprio`, etc.).

---

## 8. Testes e validação

Os testes foram executados contra o backend real e o PostgreSQL local, com login, criação, edição, exclusão, leitura e permissões de verdade. Não foram usados mocks de API.

### Resultados

| Suíte | Verificações | Resultado |
|---|---|---|
| E2E principal (`frontend/scripts/e2e.mjs`) | 16 | 16/16 |
| E2E complementar (`frontend/scripts/e2e-extra.mjs`) | 8 | 8/8 |
| Transferência de liderança | incluída no E2E complementar, validada também em dois contextos | Aprovado |
| Verificações finais (`frontend/scripts/final-check.mjs`) | 7 | 7/7 |
| Responsividade | 390, 768, 1024 e 1440 px | Sem overflow horizontal |
| TypeScript | `tsc --noEmit` | Sem erros |
| Build de produção | `vite build` | Concluído |

### Cenários cobertos

- Login válido e inválido; cadastro e login com a conta criada.
- Sessão revalidada ao recarregar; logout.
- Agenda: criar, editar, concluir, filtrar e excluir atividade individual e de banda.
- Calendário: abertura de modal com a data do dia clicado.
- Repertório: criar com tom/duração/músicos, editar duração e excluir.
- Eventos: criar com setlist e equipamentos, abrir detalhe, editar e excluir.
- Equipamentos: criar, editar e excluir.
- Ensaios: criar, editar e excluir.
- Bandas: criar, editar, adicionar/remover membro, transferir liderança e excluir como novo líder.
- Entrada por código de convite.
- Feedback anônimo: enviar, editar como líder e excluir.
- Perfil: editar função musical, alterar senha, entrar com a nova senha e restaurar.
- Inativação de perfil e bloqueio de novo login (`403 Conta inativa`).
- Permissões: integrante não vê "Novo evento", "Adicionar música", "Adicionar membro" nem o código de convite.
- Avisos do topo, 404, login inválido e modo ao vivo no celular.

### Como repetir as verificações de UI

Com backend e frontend em execução e com o Chrome instalado:

```bash
cd frontend
npm install
node scripts/e2e.mjs
node scripts/e2e-extra.mjs
node scripts/final-check.mjs
```

Os scripts usam o usuário de demonstração criado por `npm run seed`.

---

## 9. Limitações e decisões registradas

Estas limitações vêm do contrato atual do backend ou de lacunas explicitamente apontadas na documentação. Nenhuma foi mascarada com dados simulados.

| Limitação | Situação atual | Caminho técnico necessário |
|---|---|---|
| Sincronização e alertas ao vivo entre dispositivos | O modo ao vivo controla o setlist no dispositivo e persiste o andamento localmente. As entradas por música são exibidas a partir do repertório real. | Adicionar WebSocket/SSE, persistência de sessão ao vivo e endpoint de alertas no backend. |
| Ordem do setlist | `Evento_Repertorio` não possui coluna de ordem; a ordem segue o id do repertório. | Adicionar `ordem` ao vínculo evento-repertório e endpoints para reordenar. |
| Autoria de feedback anônimo | O backend retorna `idMusico: null` para todos; o autor não é identificável pela UI. | Expor ao autor (ou ao líder) um identificador seguro separado, mantendo o anonimato público. |
| Líder editar dados de outro músico | O backend só permite `PATCH /musicos/:id` para o próprio usuário. | Criar regra/endpoint específico de gestão de membro, se o projeto decidir que isso é permitido. |
| Recuperação de senha | Não existe endpoint no backend. | Implementar token de redefinição e envio de e-mail. |
| Horário de ensaio e evento | Os modelos `Ensaio` e `Evento` guardam apenas data; o horário existe em `Agenda`. | Adicionar campo de horário e migração, se necessário. |
| Lembretes | Avisos são derivados no cliente a partir de agenda, ensaios e eventos. Não há push/e-mail nem marcação de lido persistida. | Serviço de notificações no backend + preferências do usuário. |
| Upload de foto | O backend aceita uma URL (`fotoPerfil`), não um arquivo. | Integrar storage (S3/local) e upload multipart. |
| Indicadores do dashboard | Calculados no cliente a partir das listagens reais; não há endpoint de agregação. | Criar endpoint de resumo, se o volume justificar. |
| Criação automática de agenda a partir de ensaio/evento | Não é feita pelo backend. A agenda permite vincular uma atividade a um evento manualmente. | Definir a regra e criar a transação no backend. |
| Reordenação do setlist | O modo ao vivo permite navegar, mas não reordenar e salvar a ordem. | Requer o campo de ordem citado acima. |

---

## 10. Segurança e integridade

- Nenhuma senha ou hash é exposto no frontend.
- O token é enviado apenas no cabeçalho `Authorization`; não é colocado em URL.
- Segredos ficam em `.env` (ignorado pelo Git); `.env.example` não contém valores reais.
- O frontend não substitui as validações do backend: todos os formulários também são validados no servidor.
- Erros de autorização e autenticação são tratados; `401` encerra a sessão e `403` exibe a mensagem da regra.
- Exclusões usam confirmação e a API aplica exclusão lógica.
- A integridade referencial é preservada: eventos só aceitam repertórios/equipamentos da mesma banda; agendas de banda exigem liderança; feedbacks exigem participação.

> O token é armazenado em `localStorage` porque o backend atual entrega um JWT no corpo da resposta e não oferece cookie `HttpOnly`. Para produção de alto risco, o recomendado é migrar a sessão para cookie `HttpOnly`, `Secure` e `SameSite`, com proteção CSRF.

---

## 11. Decisões de interface

- Tema escuro com fundo roxo profundo, cards em violeta, CTA amarelo e destaques em roxo vibrante.
- Tela de autenticação clara (creme) em contraste com o palco escuro, replicando a referência visual.
- Tipografia Sora para títulos e Manrope para texto.
- Sidebar fixa no desktop e drawer no celular.
- Tabelas viram cards em telas pequenas; filtros e ações permanecem acessíveis.
- Estados vazios orientam o próximo passo (criar banda, adicionar música etc.).
- A imagem de fundo da autenticação é um asset local gerado para o projeto, sem dependência de banco de imagens externo.

Capturas adicionais: [login](refs/screens/01-login.png) · [repertório](refs/screens/05-repertorio.png) · [detalhe do evento](refs/screens/12-evento-detalhe.png) · [modo ao vivo](refs/screens/13-modo-ao-vivo.png) · [dashboard mobile](refs/screens/16-mobile-dashboard.png).

---

## 12. Checklist de entrega

- [x] Frontend completo e responsivo
- [x] Integração real com o backend existente
- [x] Autenticação JWT, perfil e sessão
- [x] CRUD de bandas, membros, repertório, agenda, ensaios, eventos, equipamentos e feedback
- [x] Entrada por código de convite
- [x] Controle de acesso por banda no frontend e no backend
- [x] Dashboard com dados reais
- [x] Modo ao vivo com setlist e duração
- [x] Estados de carregamento, erro, vazio e confirmação
- [x] Testes ponta a ponta com dados persistidos
- [x] Build de produção
- [x] Documentação de execução, divergências e limitações
