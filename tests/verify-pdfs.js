import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const port = 3100;
const profiles = ["fullstack-ia-ihm", "java-angular", "saas-automation", "fullstack-en"];
const titles = { "fullstack-ia-ihm": "Développeur full-stack junior — React, Node.js, IA & IHM", "java-angular": "Développeur logiciel junior — Java, Spring Boot & Angular", "saas-automation": "Ingénieur informatique junior — SaaS, automatisation & outils digitaux", "fullstack-en": "Junior Full-Stack Engineer — React, TypeScript & Applied AI" };
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
    const inspection = spawnSync("python", ["-c", "import io,json,sys; from pypdf import PdfReader; r=PdfReader(io.BytesIO(sys.stdin.buffer.read())); urls=[str(a.get_object().get('/A',{}).get('/URI','')) for p in r.pages for a in (p.get('/Annots') or [])]; m=r.metadata; print(json.dumps({'author':m.author,'title':m.title,'urls':urls}))"], { input: pdf });
    if (inspection.status !== 0) throw new Error(`Impossible d’inspecter ${profile}/${layout}.`);
    const metadata = JSON.parse(inspection.stdout);
    if (metadata.author !== "Maxence Roques" || metadata.title !== titles[profile]) throw new Error(`${profile}/${layout} contient des métadonnées PDF incorrectes.`);
    if (!["linkedin.com/in/maxence-roques", "github.com/MaxenceRoques", "maxenceroques.github.io/portfolio"].every((url) => metadata.urls.some((candidate) => candidate.includes(url)))) throw new Error(`${profile}/${layout} contient des liens PDF manquants.`);
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
