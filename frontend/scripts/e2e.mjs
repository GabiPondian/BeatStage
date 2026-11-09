import { chromium } from "playwright-core";

const BASE = "http://127.0.0.1:3000/api";
const APP = "http://127.0.0.1:5173";
const stamp = Date.now();
const results = [];
const failures = [];

function ok(name, detail = "") {
  results.push({ name, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function check(name, fn) {
  try {
    await fn();
    ok(name);
  } catch (error) {
    failures.push({ name, error });
    console.error(`✗ ${name}: ${error.message}`);
  }
}

async function api(path, { method = "GET", body, token } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status} ${data?.mensagem ?? ""}`);
  return data;
}

async function apiLogin(email, senha) {
  return api("/auth/login", { method: "POST", body: { email, senha } });
}

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"]
});

const errors = [];
function watch(page, label) {
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${label} console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`${label} pageerror: ${err.message}`));
}

async function loginPage(page, email, senha) {
  await page.goto(`${APP}/login`, { waitUntil: "networkidle" });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-senha").fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/inicio");
  await page.waitForTimeout(500);
}

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo"
});
const page = await context.newPage();
watch(page, "líder");

const lider = await apiLogin("manoel@beatstage.demo", "demo12345");
const bandas = await api("/bandas", { token: lider.token });
const banda = bandas.find((item) => item.nome === "Aurora Elétrica");
if (!banda) throw new Error("Banda de demonstração não encontrada. Rode o seed.");

await loginPage(page, "manoel@beatstage.demo", "demo12345");
await page.screenshot({ path: "refs/screens/20-e2e-login-ok.png" });

// ---------------- AGENDA ----------------
await page.goto(`${APP}/agenda`, { waitUntil: "networkidle" });
const agendaTitulo = `E2E reunião ${stamp}`;
const agendaEditada = `E2E reunião editada ${stamp}`;

await check("Agenda: criar atividade individual", async () => {
  await page.getByRole("button", { name: "Nova atividade" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#agenda-titulo").fill(agendaTitulo);
  await dialog.locator("#agenda-data").fill("2026-12-15");
  await dialog.locator("#agenda-horario").fill("18:30");
  await dialog.locator("#agenda-descricao").fill("Criada pelo teste automatizado.");
  await dialog.getByRole("button", { name: "Criar atividade" }).click();
  await page.locator(".toast", { hasText: "Atividade criada" }).waitFor();
  const row = page.locator(".agenda-row").filter({ hasText: agendaTitulo });
  await row.waitFor();
  await row.scrollIntoViewIfNeeded();
});

await check("Agenda: editar atividade", async () => {
  const row = page.locator(".agenda-row").filter({ hasText: agendaTitulo });
  await row.getByRole("button", { name: "Editar atividade" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#agenda-titulo").fill(agendaEditada);
  await dialog.getByRole("button", { name: "Salvar alterações" }).click();
  await page.locator(".toast", { hasText: "Atividade atualizada" }).waitFor();
  await page.locator(".agenda-row").filter({ hasText: agendaEditada }).waitFor();
});

await check("Agenda: concluir atividade", async () => {
  const row = page.locator(".agenda-row").filter({ hasText: agendaEditada });
  await row.getByRole("button", { name: "Concluir atividade" }).click();
  await page.locator(".toast", { hasText: "Atividade concluída" }).waitFor();
  await page.getByLabel("Filtrar por situação").selectOption("concluidos");
  const concluida = page.locator(".agenda-row").filter({ hasText: agendaEditada });
  await concluida.waitFor();
  await concluida.getByText("Concluído").waitFor();
});

await check("Agenda: excluir atividade", async () => {
  const row = page.locator(".agenda-row").filter({ hasText: agendaEditada });
  await row.getByRole("button", { name: "Excluir atividade" }).click();
  await page.locator(".confirm-dialog").getByRole("button", { name: "Excluir", exact: true }).click();
  await page.locator(".toast", { hasText: "Atividade excluída" }).waitFor();
  await page.waitForTimeout(500);
  if (await page.locator(".agenda-row").filter({ hasText: agendaEditada }).count()) {
    throw new Error("A atividade ainda aparece após a exclusão");
  }
});

// ---------------- REPERTÓRIO ----------------
await page.goto(`${APP}/repertorio`, { waitUntil: "networkidle" });
const musica = `E2E Canção ${stamp}`;

await check("Repertório: criar música com tom, duração e músicos", async () => {
  await page.getByRole("button", { name: "Adicionar música" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#musica-nome").fill(musica);
  await dialog.locator("#musica-tom").selectOption("G");
  await dialog.locator("#musica-duracao").fill("02:30");
  await dialog.locator("#musica-observacao").fill("Música criada pelo teste E2E.");
  const primeiroMusico = dialog.locator(".musician-picker li").first();
  await primeiroMusico.locator('input[type="checkbox"]').check();
  await primeiroMusico.locator('input[placeholder^="Função nesta música"]').fill("Guitarra");
  await dialog.getByRole("button", { name: "Adicionar ao repertório" }).click();
  await page.locator(".toast", { hasText: "Música adicionada" }).waitFor();
  await page.getByLabel("Buscar música no repertório").fill(musica);
  const row = page.locator(".data-table tbody tr").filter({ hasText: musica });
  await row.waitFor();
  await row.getByText("2:30").waitFor();
});

await check("Repertório: editar duração", async () => {
  const row = page.locator(".data-table tbody tr").filter({ hasText: musica });
  await row.getByRole("button", { name: `Editar ${musica}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#musica-duracao").fill("03:00");
  await dialog.getByRole("button", { name: "Salvar alterações" }).click();
  await page.locator(".toast", { hasText: "Música atualizada" }).waitFor();
  await page.locator(".data-table tbody tr").filter({ hasText: musica }).getByText("3:00").waitFor();
});

await check("Repertório: excluir música", async () => {
  const row = page.locator(".data-table tbody tr").filter({ hasText: musica });
  await row.getByRole("button", { name: `Excluir ${musica}` }).click();
  await page.locator(".confirm-dialog").getByRole("button", { name: "Excluir", exact: true }).click();
  await page.locator(".toast", { hasText: "Música excluída" }).waitFor();
  await page.waitForTimeout(500);
  if (await page.locator(".data-table tbody tr").filter({ hasText: musica }).count()) {
    throw new Error("A música ainda aparece após a exclusão");
  }
});

// ---------------- EVENTOS ----------------
const eventoNome = `E2E Festival ${stamp}`;
const eventoEditado = `E2E Festival editado ${stamp}`;

await check("Eventos: criar com setlist e equipamentos", async () => {
  await page.goto(`${APP}/eventos`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Novo evento" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#evento-nome").fill(eventoNome);
  await dialog.locator("#evento-data").fill("2026-12-20");
  await dialog.locator("#evento-local").fill("Arena do Teste");
  await dialog.locator("#evento-descricao").fill("Evento criado pelo teste E2E.");
  await dialog.locator(".check-list").first().locator('input[type="checkbox"]').first().check();
  await dialog.locator(".check-list").last().locator('input[type="checkbox"]').first().check();
  await dialog.getByRole("button", { name: "Criar evento" }).click();
  await page.locator(".toast", { hasText: "Evento criado" }).waitFor();
  const card = page.locator(".event-card").filter({ hasText: eventoNome });
  await card.waitFor();
});

await check("Eventos: abrir detalhe, editar e validar setlist", async () => {
  const card = page.locator(".event-card").filter({ hasText: eventoNome });
  await card.getByText("Ver evento").click();
  await page.waitForURL("**/eventos/*");
  await page.getByRole("heading", { level: 1, name: eventoNome }).waitFor();
  await page.getByRole("button", { name: "Editar" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#evento-nome").fill(eventoEditado);
  await dialog.getByRole("button", { name: "Salvar alterações" }).click();
  await page.locator(".toast", { hasText: "Evento atualizado" }).waitFor();
  await page.getByRole("heading", { level: 1, name: eventoEditado }).waitFor();
  await page.locator(".setlist__item").first().waitFor();
});

await check("Eventos: excluir evento", async () => {
  await page.getByRole("button", { name: "Excluir" }).click();
  await page.locator(".confirm-dialog").getByRole("button", { name: "Excluir", exact: true }).click();
  await page.locator(".toast", { hasText: "Evento excluído" }).waitFor();
  await page.waitForURL("**/eventos");
  await page.locator(".event-card").filter({ hasText: eventoEditado }).waitFor({ state: "detached" });
});

// ---------------- FEEDBACK ----------------
const feedbackTexto = `E2E comentário ${stamp}`;
const feedbackEditado = `E2E comentário editado ${stamp}`;

await check("Feedback: enviar anônimo, editar e excluir", async () => {
  await page.goto(`${APP}/feedback`, { waitUntil: "networkidle" });
  await page.locator("#feedback-comentario").fill(feedbackTexto);
  await page.getByLabel("Enviar anonimamente").check();
  await page.getByRole("button", { name: "Enviar feedback" }).click();
  await page.locator(".toast", { hasText: "Feedback enviado" }).waitFor();
  const card = page.locator(".feedback-card").filter({ hasText: feedbackTexto });
  await card.waitFor();
  await card.getByRole("button", { name: "Editar" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#editar-feedback").fill(feedbackEditado);
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await page.locator(".toast", { hasText: "Feedback atualizado" }).waitFor();
  const editedCard = page.locator(".feedback-card").filter({ hasText: feedbackEditado });
  await editedCard.waitFor();
  await editedCard.getByRole("button", { name: "Excluir" }).click();
  await page.locator(".confirm-dialog").getByRole("button", { name: "Excluir", exact: true }).click();
  await page.locator(".toast", { hasText: "Feedback excluído" }).waitFor();
});

// ---------------- PERFIL ----------------
await check("Perfil: editar função musical e restaurar", async () => {
  await page.goto(`${APP}/perfil`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Editar perfil" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#perfil-cargo").fill("Guitarrista e produtor");
  await dialog.getByRole("button", { name: "Salvar alterações" }).click();
  await page.locator(".toast", { hasText: "Perfil atualizado" }).waitFor();
  await page.locator(".profile-info dd", { hasText: "Guitarrista e produtor" }).waitFor();
  await page.getByRole("button", { name: "Editar perfil" }).click();
  const dialog2 = page.getByRole("dialog");
  await dialog2.locator("#perfil-cargo").fill("Guitarrista");
  await dialog2.getByRole("button", { name: "Salvar alterações" }).click();
  await page.locator(".toast", { hasText: "Perfil atualizado" }).waitFor();
});

// ---------------- ENTRAR POR CÓDIGO ----------------
const joaoEmail = `joao.e2e.${stamp}@beatstage.demo`;
let joao = null;

await check("Bandas: entrar com código de convite", async () => {
  const criado = await api("/musicos", {
    method: "POST",
    body: { nome: "João E2E", email: joaoEmail, senha: "demo12345", cargo: "Baixista" }
  });
  const login = await apiLogin(joaoEmail, "demo12345");
  joao = { ...criado.musico, token: login.token };

  const joinContext = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo"
  });
  const joinPage = await joinContext.newPage();
  watch(joinPage, "joão");
  await loginPage(joinPage, joaoEmail, "demo12345");
  await joinPage.goto(`${APP}/bandas`, { waitUntil: "networkidle" });
  await joinPage.getByRole("button", { name: "Entrar com código" }).click();
  const dialog = joinPage.getByRole("dialog");
  await dialog.locator("#codigo-convite").fill(banda.codigoConvite);
  await dialog.getByRole("button", { name: "Entrar na banda" }).click();
  await joinPage.waitForURL(`**/bandas/${banda.idBanda}`);
  await joinPage.getByText("Você participa desta banda").waitFor();
  await joinPage.screenshot({ path: "refs/screens/21-membro-entrou.png", fullPage: true });
  await joinContext.close();
});

// limpeza do usuário de entrada por código
if (joao) {
  const atuais = await api("/bandas", { token: lider.token });
  const atual = atuais.find((item) => item.idBanda === banda.idBanda);
  await api(`/bandas/${banda.idBanda}`, {
    method: "PATCH",
    token: lider.token,
    body: { idMembros: atual.idMembros.filter((id) => id !== joao.idMusico) }
  });
  await api(`/musicos/${joao.idMusico}`, { method: "DELETE", token: joao.token });
}

// ---------------- PERMISSÕES DO MÚSICO ----------------
await check("Permissões: integrante não vê ações de líder", async () => {
  const memberContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo"
  });
  const memberPage = await memberContext.newPage();
  watch(memberPage, "marina");
  await loginPage(memberPage, "marina@beatstage.demo", "demo12345");

  await memberPage.goto(`${APP}/eventos`, { waitUntil: "networkidle" });
  if (await memberPage.getByRole("button", { name: "Novo evento" }).count()) {
    throw new Error("Integrante vê o botão Novo evento");
  }

  await memberPage.goto(`${APP}/repertorio`, { waitUntil: "networkidle" });
  if (await memberPage.getByRole("button", { name: "Adicionar música" }).count()) {
    throw new Error("Integrante vê o botão Adicionar música");
  }

  await memberPage.goto(`${APP}/bandas/${banda.idBanda}`, { waitUntil: "networkidle" });
  await memberPage.getByText("Convite protegido").waitFor();
  if (await memberPage.getByRole("button", { name: "Adicionar membro" }).count()) {
    throw new Error("Integrante vê o botão Adicionar membro");
  }
  if (await memberPage.getByText("URL73BDP").count()) {
    throw new Error("Integrante vê o código de convite");
  }
  await memberPage.screenshot({ path: "refs/screens/22-membro-banda.png", fullPage: true });
  await memberContext.close();
});

// ---------------- CADASTRO ----------------
await check("Cadastro: criar conta e autenticar", async () => {
  const cadastroEmail = `cadastro.e2e.${stamp}@beatstage.demo`;
  const cadastroContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo"
  });
  const cadastroPage = await cadastroContext.newPage();
  watch(cadastroPage, "cadastro");
  await cadastroPage.goto(`${APP}/cadastro`, { waitUntil: "networkidle" });
  await cadastroPage.locator("#cadastro-nome").fill("Cadastro E2E");
  await cadastroPage.locator("#cadastro-email").fill(cadastroEmail);
  await cadastroPage.locator("#cadastro-cargo").fill("Violinista");
  await cadastroPage.locator("#cadastro-senha").fill("senhaE2E123");
  await cadastroPage.locator("#cadastro-confirmar").fill("senhaE2E123");
  await cadastroPage.getByRole("button", { name: "Criar minha conta" }).click();
  await cadastroPage.waitForURL("**/login");
  await cadastroPage.getByText("Cadastro realizado com sucesso!").waitFor();
  await cadastroPage.locator("#login-email").fill(cadastroEmail);
  await cadastroPage.locator("#login-senha").fill("senhaE2E123");
  await cadastroPage.getByRole("button", { name: "Entrar", exact: true }).click();
  await cadastroPage.waitForURL("**/inicio");
  await cadastroPage.getByText("Sua banda começa aqui").waitFor();

  const novo = await apiLogin(cadastroEmail, "senhaE2E123");
  await api(`/musicos/${novo.musico.idMusico}`, { method: "DELETE", token: novo.token });
  await cadastroContext.close();
});

// ---------------- MOBILE DRAWER ----------------
await check("Responsivo: menu lateral no celular", async () => {
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo"
  });
  const mobilePage = await mobileContext.newPage();
  watch(mobilePage, "mobile");
  await loginPage(mobilePage, "manoel@beatstage.demo", "demo12345");
  await mobilePage.getByRole("button", { name: "Abrir menu" }).click();
  await mobilePage.locator(".sidebar.is-open").waitFor();
  await mobilePage.screenshot({ path: "refs/screens/23-mobile-drawer.png", fullPage: true });
  await mobilePage.getByRole("link", { name: "Repertório" }).click();
  await mobilePage.waitForURL("**/repertorio");
  await mobileContext.close();
});

await page.screenshot({ path: "refs/screens/24-e2e-final.png", fullPage: true });

console.log("\nRESULTADO:");
console.log(`  ${results.length} verificações passaram`);
console.log(`  ${failures.length} falharam`);
if (errors.length) {
  console.log("\nErros de console:");
  errors.forEach((error) => console.log(`  - ${error}`));
}
if (failures.length) {
  console.log("\nFalhas:");
  failures.forEach((failure) => console.log(`  - ${failure.name}: ${failure.error.message}`));
  process.exitCode = 1;
}

await browser.close();
