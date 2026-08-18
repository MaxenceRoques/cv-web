import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 3000;

const PROFILES = new Set(["fullstack-ia-ihm", "java-angular", "saas-automation", "fullstack-en"]);
const STYLES = new Set(["tech", "elegant", "ocean", "executive", "minimal"]);
const LAYOUTS = new Set(["multi", "single"]);
const PROFILE_TITLES = new Map([
  ["fullstack-ia-ihm", "Développeur full-stack junior — React, Node.js, IA & IHM"],
  ["java-angular", "Développeur logiciel junior — Java, Spring Boot & Angular"],
  ["saas-automation", "Ingénieur informatique junior — SaaS, automatisation & outils digitaux"],
  ["fullstack-en", "Junior Full-Stack Engineer — React, TypeScript & Applied AI"],
]);
const PUBLIC_FILES = new Set([
  "index.html",
  "styles.css",
  "script.js",
  "content/master-profile.js",
  "content/profiles.js",
  "assets/portrait-maxence.jpg",
]);
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

let browserPromise;

function addPdfMetadata(pdf, title, language) {
  return new Promise((resolve, reject) => {
    const process = spawn("python", [path.join(ROOT_DIRECTORY, "scripts", "pdf-metadata.py"), Buffer.from(title).toString("base64"), Buffer.from(language).toString("base64")]);
    const output = [];
    const errors = [];
    process.stdout.on("data", (chunk) => output.push(chunk));
    process.stderr.on("data", (chunk) => errors.push(chunk));
    process.stdin.on("error", () => {});
    process.on("error", reject);
    process.on("close", (code) => code === 0 ? resolve(Buffer.concat(output)) : reject(new Error(Buffer.concat(errors).toString() || "Métadonnées PDF indisponibles.")));
    process.stdin.end(pdf);
  });
}

function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium
      .launch({
        headless: true,
        args: ["--no-sandbox"],
      })
      .catch((error) => {
        browserPromise = undefined;
        throw error;
      });
  }

  return browserPromise;
}

async function generatePdf(profile, style, layout) {
  const browser = await getBrowser();
  const context = await browser.newContext();

  try {
    const page = await context.newPage();
    const parameters = new URLSearchParams();

    if (profile !== "fullstack-ia-ihm") parameters.set("profil", profile);
    if (style !== "tech") parameters.set("style", style);
    if (layout !== "multi") parameters.set("layout", layout);

    const pageUrl =
      `http://127.0.0.1:${PORT}/index.html` +
      (parameters.size ? `?${parameters.toString()}` : "");

    await page.goto(pageUrl, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () =>
        ["#presentation", "#contenu"].every(
          (selector) =>
            document.querySelector(selector)?.getAttribute("aria-busy") ===
            "false",
        ),
      undefined,
      { timeout: 15_000 },
    );
    await page.evaluate(() => document.fonts.ready);

    return await page.pdf({
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
    });
  } finally {
    await context.close();
  }
}

async function serveStaticFile(response, pathname) {
  const requestedFile = pathname === "/" ? "index.html" : pathname.slice(1);

  if (!PUBLIC_FILES.has(requestedFile)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Fichier introuvable.");
    return;
  }

  const filePath = path.join(ROOT_DIRECTORY, requestedFile);

  try {
    const fileStats = await stat(filePath);
    const contentType =
      MIME_TYPES[path.extname(filePath)] || "application/octet-stream";

    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": fileStats.size,
      "Cache-Control": "no-cache",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Fichier introuvable.");
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", "http://localhost");

  if (requestUrl.pathname === "/api/pdf") {
    const requestedProfile = requestUrl.searchParams.get("profil");
    const requestedStyle = requestUrl.searchParams.get("style");
    const requestedLayout = requestUrl.searchParams.get("layout");
    const profile = PROFILES.has(requestedProfile)
      ? requestedProfile
      : "fullstack-ia-ihm";
    const style = STYLES.has(requestedStyle) ? requestedStyle : "tech";
    const layout = LAYOUTS.has(requestedLayout) ? requestedLayout : "multi";

    try {
      const title = PROFILE_TITLES.get(profile);
      const pdf = await addPdfMetadata(
        await generatePdf(profile, style, layout),
        title,
        profile === "fullstack-en" ? "English" : "French",
      );
      const layoutSuffix = layout === "single" ? "-ats" : "";
      const filename = `cv-maxence-roques-${profile}${layoutSuffix}.pdf`;

      response.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdf.length,
        "Cache-Control": "no-store",
      });
      response.end(pdf);
    } catch (error) {
      console.error("La génération du PDF a échoué :", error);
      response.writeHead(500, {
        "Content-Type": "application/json; charset=utf-8",
      });
      response.end(
        JSON.stringify({
          error:
            "Le PDF n’a pas pu être généré. Vérifiez que Chromium est installé.",
        }),
      );
    }
    return;
  }

  await serveStaticFile(response, requestUrl.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`CV disponible sur http://localhost:${PORT}`);
});

async function closeGracefully() {
  if (browserPromise) {
    const browser = await browserPromise.catch(() => undefined);
    await browser?.close();
  }
  server.close();
}

process.on("SIGINT", closeGracefully);
process.on("SIGTERM", closeGracefully);
