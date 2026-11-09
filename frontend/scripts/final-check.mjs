import { chromium } from "playwright-core";
const APP = "http://127.0.0.1:5173";
const failures = [];
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox", "--disable-gpu"] });

async function check(name, fn) {
  try { await fn(); console.log("✓", name); }
  catch (e) { failures.push([name, e.message]); console.log("✗", name, e.message); }
}
async function login(page, email, senha) {
  await page.goto(`${APP}/login`, { waitUntil: "networkidle" });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-senha").fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/inicio");
  await page.waitForTimeout(700);
}

// overflow tablet/desktop intermediate
for (const width of [768, 1024]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await context.newPage();
  await login(page, "manoel@beatstage.demo", "demo12345");
  for (const path of ["/inicio", "/agenda", "/bandas", "/repertorio", "/eventos", "/ensaios", "/equipamentos", "/feedback", "/perfil"]) {
    await page.goto(`${APP}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) failures.push([`overflow ${width} ${path}`, `+${overflow}px`]);
  }
  console.log(`✓ sem overflow horizontal em ${width}px`);
  await context.close();
}

const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
const page = await context.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));
await login(page, "manoel@beatstage.demo", "demo12345");

await check("Avisos do topo abrem e listam compromissos", async () => {
  await page.getByRole("button", { name: /Avisos/ }).click();
  await page.getByText("Avisos do palco").waitFor();
  const items = page.locator(".reminder-list li");
  if ((await items.count()) === 0) throw new Error("Lista de avisos vazia");
  await page.getByRole("link", { name: /Ver agenda completa/ }).click();
  await page.waitForURL("**/agenda");
});

await check("Calendário abre modal ao clicar em um dia", async () => {
  await page.getByRole("button", { name: "Calendário" }).click();
  const day = page.locator(".calendar__day").filter({ hasText: /^20$/ }).first();
  await day.click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#agenda-titulo").waitFor();
  const value = await dialog.locator("#agenda-data").inputValue();
  if (value !== "2026-11-20") throw new Error(`Data inesperada: ${value}`);
  await dialog.getByRole("button", { name: "Cancelar" }).click();
});

await check("Rota inexistente mostra 404", async () => {
  await page.goto(`${APP}/rota-que-nao-existe`, { waitUntil: "networkidle" });
  await page.getByText("Essa música não está no setlist.").waitFor();
  await page.getByRole("link", { name: "Voltar ao painel" }).waitFor();
});

await check("Login inválido mostra mensagem sem revelar detalhes", async () => {
  const invalid = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const p = await invalid.newPage();
  await p.goto(`${APP}/login`, { waitUntil: "networkidle" });
  await p.locator("#login-email").fill("manoel@beatstage.demo");
  await p.locator("#login-senha").fill("senhaErrada");
  await p.getByRole("button", { name: "Entrar", exact: true }).click();
  await p.locator(".alert--error", { hasText: "E-mail ou senha inválidos" }).waitFor();
  await invalid.close();
});

await check("Modo ao vivo no celular não estoura a largura", async () => {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const p = await mobile.newPage();
  await login(p, "manoel@beatstage.demo", "demo12345");
  await p.goto(`${APP}/ao-vivo/1`, { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error(`Overflow de ${overflow}px`);
  await p.screenshot({ path: "refs/screens/33-mobile-ao-vivo.png", fullPage: true });
  await mobile.close();
});

console.log("\nfalhas:", failures.length);
if (errors.length) console.log("erros de console:", errors);
if (failures.length) { failures.forEach(([n, m]) => console.log(" -", n, m)); process.exitCode = 1; }
await browser.close();
