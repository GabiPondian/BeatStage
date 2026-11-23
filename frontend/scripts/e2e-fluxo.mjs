import { chromium } from "playwright-core";

const APP = "http://localhost:5173";
const stamp = Date.now();
const nomeEvento = `Show E2E de Verificacao ${stamp}`;

const aprovados = [];
const falhas = [];
const erros = [];

async function passo(nome, fn) {
  try {
    await fn();
    aprovados.push(nome);
    console.log(`OK    ${nome}`);
  } catch (erro) {
    falhas.push([nome, erro.message]);
    console.log(`FALHA ${nome} :: ${erro.message}`);
    console.log(`      url atual: ${page.url()}`);
    console.log(`      storage: ${await page.evaluate(() => JSON.stringify(Object.keys(window.localStorage))).catch(() => "indisponivel")}`);
    console.log(`      tela: ${(await page.locator("body").innerText().catch(() => "")).slice(0, 180).replace(/\s+/g, " ")}`);
  }
}

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"]
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo"
});
const page = await context.newPage();
page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));
page.on("response", (r) => {
  if (r.url().includes("/api/") && r.status() >= 500) erros.push(`${r.status()} ${r.url()}`);
  if (r.url().includes("/api/") && r.status() >= 400) console.log(`      API ${r.status()} ${r.url().replace(APP, "")}`);
});
page.on("requestfailed", (r) => {
  if (r.url().includes("/api/")) console.log(`      API falhou: ${r.failure()?.errorText} ${r.url().replace(APP, "")}`);
});

let ensaioAberto = "";
let eventoId = null;

await passo("1. login com manoel@beatstage.demo", async () => {
  await page.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#login-email").fill("manoel@beatstage.demo");
  await page.locator("#login-senha").fill("demo12345");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/inicio", { timeout: 15000 });
  // Espera a validacao do token (/musicos/perfil) terminar antes de navegar:
  // um reload no meio dela aborta a requisicao e o app encerra a sessao.
  await page.getByRole("heading", { name: /^Olá,/ }).waitFor({ state: "visible", timeout: 15000 });
});

await passo("2. listagem de bandas mostra Aurora Eletrica", async () => {
  await page.goto(`${APP}/bandas`, { waitUntil: "domcontentloaded" });
  const card = page.getByRole("heading", { name: "Aurora Elétrica" }).first();
  await card.waitFor({ state: "visible", timeout: 10000 });
  const cards = await page.locator(".band-card").count();
  if (cards < 1) throw new Error("nenhum card de banda renderizado");
  console.log(`      ${cards} card(s) de banda na tela`);
});

await passo("3. abrir um ensaio pela lista", async () => {
  await page.goto(`${APP}/ensaios`, { waitUntil: "domcontentloaded" });
  const cards = page.locator(".rehearsal-card");
  await cards.first().waitFor({ state: "visible", timeout: 15000 });
  const total = await cards.count();
  if (total === 0) throw new Error("lista de ensaios vazia");
  ensaioAberto = (await cards.first().locator("h2").innerText()).trim().replace(/\s+/g, " ");
  await cards.first().getByRole("link", { name: "Ver detalhes do ensaio" }).click();
  await page.waitForURL(/\/ensaios\/\d+$/, { timeout: 10000 });
  await page.getByRole("heading", { name: "Informações do encontro" }).waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("heading", { name: "Localização" }).waitFor({ state: "visible", timeout: 5000 });
  const titulo = (await page.locator("h1").first().innerText()).trim().replace(/\s+/g, " ");
  if (titulo.slice(0, 12) !== ensaioAberto.slice(0, 12)) {
    throw new Error(`titulo da pagina "${titulo}" nao corresponde ao card "${ensaioAberto}"`);
  }
  console.log(`      ensaio "${ensaioAberto}" abriu em ${new URL(page.url()).pathname}`);
});

await passo("4. criar evento pela interface", async () => {
  await page.goto(`${APP}/eventos`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Novo evento" }).click();
  await page.locator("#evento-banda").waitFor({ state: "visible", timeout: 5000 });
  await page.locator("#evento-banda").selectOption({ label: "Aurora Elétrica" });
  await page.locator("#evento-data").fill("2026-12-12");
  await page.locator("#evento-nome").fill(nomeEvento);
  await page.locator("#evento-local").fill("Arena BeatStage");
  await page.locator("#evento-descricao").fill("Registro criado por teste de ponta a ponta.");
  await page.getByRole("button", { name: "Criar evento" }).click();
  await page.waitForTimeout(2500);
  if (await page.locator("#evento-nome").isVisible()) {
    const erro = await page.locator(".field__error, .alert, .form-error").allInnerTexts();
    throw new Error(`modal continuou aberto apos salvar. erros na tela: ${erro.join(" | ")}`);
  }
  await page.getByText(nomeEvento, { exact: false }).first().waitFor({ state: "visible", timeout: 10000 });
  console.log(`      evento "${nomeEvento}" aparece na lista de eventos`);
});

await passo("5. evento criado existe na API", async () => {
  const token = await page.evaluate(() => {
    for (const chave of Object.keys(window.localStorage)) {
      if (chave.toLowerCase().includes("token")) return window.localStorage.getItem(chave);
    }
    return null;
  });
  if (!token) throw new Error("token JWT nao encontrado no localStorage");
  const resposta = await page.request.get("http://127.0.0.1:3000/api/eventos", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resposta.ok()) throw new Error(`GET /eventos -> ${resposta.status()}`);
  const eventos = await resposta.json();
  const criado = eventos.find((e) => e.nome === nomeEvento);
  if (!criado) throw new Error("evento nao retornado pela API");
  console.log(`      id ${criado.idEvento}, data ${criado.data}, banda ${criado.idBanda}`);
  eventoId = criado.idEvento;
});

await passo("6. limpeza: remover o evento de teste", async () => {
  if (!eventoId) throw new Error("nada a remover");
  const token = await page.evaluate(() => window.localStorage.getItem("beatstage.token"));
  const resposta = await page.request.delete(`http://127.0.0.1:3000/api/eventos/${eventoId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resposta.ok()) throw new Error(`DELETE /eventos/${eventoId} -> ${resposta.status()}`);
  console.log(`      evento ${eventoId} removido`);
});

await browser.close();

console.log("\n================ RESUMO ================");
console.log(`aprovados: ${aprovados.length}`);
console.log(`falhas:    ${falhas.length}`);
if (erros.length) {
  console.log("erros de console/rede:");
  for (const e of erros) console.log(`  - ${e}`);
} else {
  console.log("erros de console/rede: nenhum");
}
if (falhas.length) process.exitCode = 1;
