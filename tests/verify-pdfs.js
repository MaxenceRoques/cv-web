import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const port = 3100;
const profiles = ["fullstack-ia-ihm", "java-angular", "saas-automation", "fullstack-en"];
const server = spawn(process.execPath, ["server.js"], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
const stop = () => server.kill("SIGTERM");
process.on("exit", stop);
async function waitForServer() { for (let attempt = 0; attempt < 40; attempt += 1) { try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 250)); } throw new Error("Le serveur local n’a pas démarré."); }
try {
  await waitForServer(); await mkdir("exports", { recursive: true });
  const browser = await chromium.launch({ headless: true });
  for (const profile of profiles) for (const layout of ["multi", "single"]) {
    const query = new URLSearchParams({ profil: profile, style: "tech", layout });
    const response = await fetch(`http://127.0.0.1:${port}/api/pdf?${query}`);
    if (!response.ok) throw new Error(`Export échoué : ${profile}/${layout} (${response.status})`);
    const pdf = Buffer.from(await response.arrayBuffer());
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;
    if (pages !== 1) throw new Error(`${profile}/${layout} contient ${pages} pages au lieu d’une page A4.`);
    const extraction = spawnSync("pdftotext", ["-", "-"], { input: pdf, encoding: "utf8" });
    if (extraction.status !== 0 || !extraction.stdout.trim()) throw new Error(`${profile}/${layout} ne peut pas être extrait proprement avec Poppler.`);
    const suffix = layout === "single" ? "-ats" : "";
    await writeFile(path.join("exports", `cv-maxence-roques-${profile}${suffix}.pdf`), pdf);
    if (layout === "single") {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${port}/?${query}`, { waitUntil: "networkidle" });
      const isLinear = await page.evaluate(() => [
        getComputedStyle(document.querySelector("main")).display,
        getComputedStyle(document.querySelector("dl")).display,
        getComputedStyle(document.querySelector("article")).display,
      ].every((display) => display === "block"));
      await page.close();
      if (!isLinear) throw new Error(`${profile}/single n’utilise pas une mise en page ATS strictement linéaire.`);
    }
    console.log(`OK · ${profile}${suffix || ""} · 1 page A4`);
  }
  await browser.close();
} finally { stop(); }
