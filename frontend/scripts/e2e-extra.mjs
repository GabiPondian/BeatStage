import { chromium } from "playwright-core";

const BASE = "http://127.0.0.1:3000/api";
const APP = "http://127.0.0.1:5173";
const stamp = Date.now();
const results = [];
const failures = [];
const errors = [];

function report(name, detail = "") {
  results.push(name);
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function check(name, fn) {
  try {
    await fn();
    report(name);
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
  await page.waitForTimeout(400);
}

async function logout(page) {
  await page.getByLabel("Menu da conta").click();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.waitForURL("**/login");
}

const lider = await apiLogin("manoel@beatstage.demo", "demo12345");
const bandas = await api("/bandas", { token: lider.token });
const bandaPrincipal = bandas.find((item) => item.nome === "Aurora Elétrica");

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo"
});
const page = await context.newPage();
watch(page, "extra");
await loginPage(page, "manoel@beatstage.demo", "demo12345");

// ---------- modal screenshots ----------
await page.goto(`${APP}/agenda`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Nova atividade" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: "refs/screens/28-modal-agenda.png" });
await page.getByRole("button", { name: "Cancelar" }).click();

await page.goto(`${APP}/repertorio`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Adicionar música" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: "refs/screens/29-modal-repertorio.png" });
await page.getByRole("button", { name: "Cancelar" }).click();

// ---------- EQUIPAMENTOS ----------
const equipamentoNome = `E2E Pedaleira ${stamp}`;

await check("Equipamentos: criar, editar e excluir", async () => {
  await page.goto(`${APP}/equipamentos`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Novo equipamento" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#equipamento-nome").fill(equipamentoNome);
  await dialog.locator("#equipamento-estado").selectOption("EMPRESTADO");
  await dialog.locator("#equipamento-responsavel").fill("Estúdio E2E");
  await dialog.locator("#equipamento-descricao").fill("Pedaleira de teste.");
  await dialog.getByRole("button", { name: "Cadastrar" }).click();
  await page.locator(".toast", { hasText: "Equipamento cadastrado" }).waitFor();
  const row = page.locator(".data-table tbody tr").filter({ hasText: equipamentoNome });
  await row.waitFor();
  await row.getByRole("button", { name: `Editar ${equipamentoNome}` }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.locator("#equipamento-estado").selectOption("PROPRIO");
  await editDialog.getByRole("button", { name: "Salvar alterações" }).click();
  await page.locator(".toast", { hasText: "Equipamento atualizado" }).waitFor();
  await page
    .locator(".data-table tbody tr")
    .filter({ hasText: equipamentoNome })
    .getByText("Próprio")
    .waitFor();
  await page
    .locator(".data-table tbody tr")
    .filter({ hasText: equipamentoNome })
    .getByRole("button", { name: `Excluir ${equipamentoNome}` })
    .click();
  await page.locator(".confirm-dialog").getByRole("button", { name: "Excluir", exact: true }).click();
  await page.locator(".toast", { hasText: "Equipamento excluído" }).waitFor();
});

// ---------- ENSAIOS ----------
const ensaioTexto = `E2E ensaio ${stamp}`;
const ensaioEditado = `E2E ensaio editado ${stamp}`;

await check("Ensaios: criar, editar e excluir", async () => {
  await page.goto(`${APP}/ensaios`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Novo ensaio" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#ensaio-data").fill("2026-12-22");
  await dialog.locator("#ensaio-local").fill("Estúdio E2E");
  await dialog.locator("#ensaio-descricao").fill(ensaioTexto);
  await dialog.getByRole("button", { name: "Agendar ensaio" }).click();
  await page.locator(".toast", { hasText: "Ensaio agendado" }).waitFor();
  const card = page.locator(".rehearsal-card").filter({ hasText: ensaioTexto });
  await card.waitFor();
  await card.getByRole("button", { name: "Editar ensaio" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.locator("#ensaio-descricao").fill(ensaioEditado);
  await editDialog.getByRole("button", { name: "Salvar alterações" }).click();
  await page.locator(".toast", { hasText: "Ensaio atualizado" }).waitFor();
  const editedCard = page.locator(".rehearsal-card").filter({ hasText: ensaioEditado });
  await editedCard.waitFor();
  await editedCard.getByRole("button", { name: "Excluir ensaio" }).click();
  await page.locator(".confirm-dialog").getByRole("button", { name: "Excluir", exact: true }).click();
  await page.locator(".toast", { hasText: "Ensaio excluído" }).waitFor();
});

// ---------- AGENDA DE BANDA ----------
const agendaBanda = `E2E agenda banda ${stamp}`;

await check("Agenda: criar, editar e excluir atividade de banda", async () => {
  await page.goto(`${APP}/agenda`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Nova atividade" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#agenda-titulo").fill(agendaBanda);
  await dialog.locator("#agenda-data").fill("2026-12-23");
  await dialog.locator("#agenda-horario").fill("17:45");
  await dialog.getByRole("button", { name: "Banda", exact: true }).click();
  await dialog.getByRole("button", { name: "Criar atividade" }).click();
  await page.locator(".toast", { hasText: "Atividade criada" }).waitFor();
  const row = page.locator(".agenda-row").filter({ hasText: agendaBanda });
  await row.waitFor();
  await row.getByText("Visível para a banda").waitFor();
  await row.getByRole("button", { name: "Editar atividade" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.locator("#agenda-titulo").fill(`${agendaBanda} editada`);
  await editDialog.getByRole("button", { name: "Salvar alterações" }).click();
  await page.locator(".toast", { hasText: "Atividade atualizada" }).waitFor();
  const editedRow = page.locator(".agenda-row").filter({ hasText: `${agendaBanda} editada` });
  await editedRow.waitFor();
  await editedRow.getByRole("button", { name: "Excluir atividade" }).click();
  await page.locator(".confirm-dialog").getByRole("button", { name: "Excluir", exact: true }).click();
  await page.locator(".toast", { hasText: "Atividade excluída" }).waitFor();
});

// ---------- BANDA: CRUD + MEMBROS + LIDERANÇA ----------
const emailMembro = `membro.banda.${stamp}@beatstage.demo`;
const nomeMembro = `Temporário Banda ${stamp}`;
const membroCriado = await api("/musicos", {
  method: "POST",
  body: { nome: nomeMembro, email: emailMembro, senha: "demo12345", cargo: "Percussionista" }
});
const membro = membroCriado.musico;
const novoNomeBanda = `E2E Banda ${stamp}`;

await check("Bandas: criar, editar, adicionar e remover membro", async () => {
  await page.goto(`${APP}/bandas`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Nova banda" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#banda-nome").fill(novoNomeBanda);
  await dialog.locator("#banda-descricao").fill("Banda criada pelo teste E2E.");
  await dialog.getByRole("button", { name: "Criar banda" }).click();
  await page.locator(".toast", { hasText: "Banda criada!" }).waitFor();
  await page.waitForURL("**/bandas/*");
  await page.getByRole("heading", { level: 1, name: novoNomeBanda }).waitFor();

  await page.getByRole("button", { name: "Editar banda" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.locator("#editar-banda-descricao").fill("Descrição atualizada pelo E2E.");
  await editDialog.getByRole("button", { name: "Salvar" }).click();
  await page.locator(".toast", { hasText: "Banda atualizada" }).waitFor();
  await page.getByText("Descrição atualizada pelo E2E.").waitFor();

  await page.getByRole("button", { name: "Adicionar membro" }).click();
  const addDialog = page.getByRole("dialog");
  await addDialog.getByLabel("Buscar músico").fill(nomeMembro);
  await addDialog.locator(".picker-row").filter({ hasText: nomeMembro }).locator('input[type="checkbox"]').check();
  await addDialog.getByRole("button", { name: /^Adicionar/ }).click();
  await page.locator(".toast", { hasText: "Integrantes adicionados" }).waitFor();
  await page.locator(".member-row").filter({ hasText: nomeMembro }).waitFor();

  await page.getByRole("button", { name: `Remover ${nomeMembro}` }).click();
  await page.locator(".confirm-dialog").getByRole("button", { name: "Remover" }).click();
  await page.locator(".toast", { hasText: "Integrante removido" }).waitFor();
  await page.locator(".member-row").filter({ hasText: nomeMembro }).waitFor({ state: "detached" });
});

await check("Bandas: transferir liderança e excluir como novo líder", async () => {
  // reencontra a banda criada
  const minhas = await api("/bandas", { token: lider.token });
  const banda = minhas.find((item) => item.nome === novoNomeBanda);
  if (!banda) throw new Error("Banda criada não encontrada");

  const membroLogin = await apiLogin(emailMembro, "demo12345");

  await page.goto(`${APP}/bandas/${banda.idBanda}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Adicionar membro" }).click();
  const addDialog = page.getByRole("dialog");
  await addDialog.getByLabel("Buscar músico").fill(nomeMembro);
  await addDialog.locator(".picker-row").filter({ hasText: nomeMembro }).locator('input[type="checkbox"]').check();
  await addDialog.getByRole("button", { name: /^Adicionar/ }).click();
  await page.locator(".toast", { hasText: "Integrantes adicionados" }).waitFor();
  await page.locator(".member-row").filter({ hasText: nomeMembro }).waitFor();

  await page.getByRole("button", { name: `Transferir liderança para ${nomeMembro}` }).click();
  const transferDialog = page.getByRole("dialog");
  await transferDialog.locator("#novo-lider").selectOption(String(membro.idMusico));
  await transferDialog.getByRole("button", { name: "Transferir", exact: true }).click();
  await page.locator(".confirm-dialog").getByRole("button", { name: "Transferir" }).click();
  await page.locator(".toast", { hasText: "Liderança transferida" }).waitFor();
  await page.getByText("Você participa desta banda").waitFor();

  const memberContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo"
  });
  const memberPage = await memberContext.newPage();
  watch(memberPage, "novo-lider");
  await loginPage(memberPage, emailMembro, "demo12345");
  await memberPage.goto(`${APP}/bandas/${banda.idBanda}`, { waitUntil: "networkidle" });
  await memberPage.getByText("Você lidera esta banda").waitFor();
  await memberPage.getByRole("button", { name: "Adicionar membro" }).waitFor();
  await memberPage.getByRole("button", { name: "Excluir" }).click();
  await memberPage.locator(".confirm-dialog").getByRole("button", { name: "Excluir banda" }).click();
  await memberPage.locator(".toast", { hasText: "Banda excluída" }).waitFor();
  await memberPage.waitForURL("**/bandas");
  await memberContext.close();

  await api(`/musicos/${membro.idMusico}`, { method: "DELETE", token: membroLogin.token });
});

// ---------- SENHA ----------
await check("Perfil: alterar senha, entrar com a nova e restaurar", async () => {
  await page.goto(`${APP}/perfil`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Alterar senha" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.locator("#senha-atual").fill("demo12345");
  await dialog.locator("#senha-nova").fill("demo123456");
  await dialog.locator("#senha-confirmar").fill("demo123456");
  await dialog.getByRole("button", { name: "Alterar senha" }).click();
  await page.locator(".toast", { hasText: "Senha alterada" }).waitFor();

  await logout(page);
  await page.locator("#login-email").fill("manoel@beatstage.demo");
  await page.locator("#login-senha").fill("demo123456");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/inicio");

  await page.goto(`${APP}/perfil`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Alterar senha" }).click();
  dialog = page.getByRole("dialog");
  await dialog.locator("#senha-atual").fill("demo123456");
  await dialog.locator("#senha-nova").fill("demo12345");
  await dialog.locator("#senha-confirmar").fill("demo12345");
  await dialog.getByRole("button", { name: "Alterar senha" }).click();
  await page.locator(".toast", { hasText: "Senha alterada" }).waitFor();
});

// ---------- INATIVAÇÃO ----------
await check("Perfil: inativar conta e bloquear novo login", async () => {
  const email = `inativar.e2e.${stamp}@beatstage.demo`;
  await api("/musicos", {
    method: "POST",
    body: { nome: "Inativar E2E", email, senha: "demo12345", cargo: "Produtor" }
  });

  const inativarContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo"
  });
  const inativarPage = await inativarContext.newPage();
  watch(inativarPage, "inativar");
  await loginPage(inativarPage, email, "demo12345");
  await inativarPage.goto(`${APP}/perfil`, { waitUntil: "networkidle" });
  await inativarPage.getByRole("button", { name: "Inativar minha conta" }).click();
  await inativarPage.locator(".confirm-dialog").getByRole("button", { name: "Inativar perfil" }).click();
  await inativarPage.waitForURL("**/login");
  await inativarPage.locator(".toast", { hasText: "Perfil inativado" }).waitFor();

  await inativarPage.locator("#login-email").fill(email);
  await inativarPage.locator("#login-senha").fill("demo12345");
  await inativarPage.getByRole("button", { name: "Entrar", exact: true }).click();
  await inativarPage.locator(".alert--error", { hasText: "Conta inativa" }).waitFor();
  await inativarContext.close();
});

// ---------- MODAL MOBILE ----------
await check("Responsivo: modal de atividade no celular", async () => {
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo"
  });
  const mobilePage = await mobileContext.newPage();
  watch(mobilePage, "mobile-modal");
  await loginPage(mobilePage, "manoel@beatstage.demo", "demo12345");
  await mobilePage.goto(`${APP}/agenda`, { waitUntil: "networkidle" });
  await mobilePage.getByRole("button", { name: "Nova atividade" }).click();
  await mobilePage.waitForTimeout(300);
  await mobilePage.screenshot({ path: "refs/screens/30-mobile-modal.png", fullPage: true });
  await mobileContext.close();
});

await page.screenshot({ path: "refs/screens/31-extra-final.png", fullPage: true });

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
