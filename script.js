const PROFILES = Object.freeze({
  backend: "content-backend.md",
  frontend: "content-frontend.md",
  fullstack: "content-fullstack.md",
});

const STYLES = Object.freeze({
  elegant: "Élégant",
  ocean: "Océan",
  executive: "Executive",
  minimal: "Minimal",
  tech: "Tech",
});

const SECTION_ORDER = Object.freeze({
  competences: 1,
  experiences: 2,
  diplomes: 3,
  "centres-d-interet": 4,
  langues: 5,
  "informations-complementaires": 6,
});

const PROFILE_LABELS = Object.freeze({
  backend: "backend",
  frontend: "frontend",
  fullstack: "fullstack",
});

const profileSelect = document.querySelector("#profile-select");
const styleSelect = document.querySelector("#style-select");
const pdfExportButton = document.querySelector("#pdf-export-button");
const presentation = document.querySelector("#presentation");
const personName = document.querySelector("#person-name");
const profileTitle = document.querySelector("#profile-title");
const profileSummary = document.querySelector("#profile-summary");
const profileDetails = document.querySelector("#profile-details");
const content = document.querySelector("#contenu");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInline(value) {
  return escapeHtml(value)
    .replace(
      /\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:)[^)]+)\)/g,
      (_, label, url) => {
        const externalAttributes = url.startsWith("http")
          ? ' target="_blank" rel="noopener noreferrer"'
          : "";
        return `<a href="${url}"${externalAttributes}>${label}</a>`;
      },
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>");
}

function parseMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].trim(),
      });
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [];

      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2).trim());
        index += 1;
      }

      blocks.push({ type: "list", items });
      continue;
    }

    const paragraph = [];
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (
        !candidate ||
        /^(#{1,3})\s+/.test(candidate) ||
        candidate.startsWith("- ")
      ) {
        break;
      }

      paragraph.push(candidate);
      index += 1;
    }

    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function sectionId(title) {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.startsWith("domaines")) return "competences";
  if (normalized.startsWith("langues")) return "langues";
  if (normalized.startsWith("diplomes")) return "diplomes";
  if (normalized.startsWith("experiences")) return "experiences";

  return normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function renderBlocks(blocks) {
  return blocks
    .map((block) => {
      if (block.type === "paragraph") {
        return `<p>${renderInline(block.text)}</p>`;
      }

      if (block.type === "list") {
        const items = block.items
          .map((item) => `<li>${renderInline(item)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }

      if (block.type === "heading") {
        return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`;
      }

      return "";
    })
    .join("");
}

function groupByHeading(blocks, level) {
  const groups = [];
  let current = null;

  for (const block of blocks) {
    if (block.type === "heading" && block.level === level) {
      current = { title: block.text, blocks: [] };
      groups.push(current);
    } else if (current) {
      current.blocks.push(block);
    }
  }

  return groups;
}

function renderSkillsSection(section, id) {
  const skills = groupByHeading(section.blocks, 3);
  const cards = skills
    .map(
      (skill) =>
        `<div><dt>${renderInline(skill.title)}</dt>` +
        `<dd>${renderBlocks(skill.blocks)}</dd></div>`,
    )
    .join("");

  return (
    `<section aria-labelledby="${id}">` +
    `<h2 id="${id}">${renderInline(section.title)}</h2>` +
    `<dl>${cards}</dl>` +
    `</section>`
  );
}

function renderExperiencesSection(section, id) {
  const experiences = groupByHeading(section.blocks, 3);
  const articles = experiences
    .map(
      (experience) =>
        `<article>` +
        `<h3>${renderInline(experience.title)}</h3>` +
        renderBlocks(experience.blocks) +
        `</article>`,
    )
    .join("");

  return (
    `<section aria-labelledby="${id}">` +
    `<h2 id="${id}">${renderInline(section.title)}</h2>` +
    articles +
    `</section>`
  );
}

function renderStandardSection(section, id) {
  return (
    `<section aria-labelledby="${id}">` +
    `<h2 id="${id}">${renderInline(section.title)}</h2>` +
    renderBlocks(section.blocks) +
    `</section>`
  );
}

function profileData(section) {
  const list = section?.blocks.find((block) => block.type === "list");
  const items = list?.items ?? [];
  const nameItem = items.find((item) => /^\*\*Nom\s*:\*\*/i.test(item));
  const name = nameItem
    ? nameItem.replace(/^\*\*Nom\s*:\*\*\s*/i, "").trim()
    : "";
  const details = items
    .filter((item) => item !== nameItem)
    .map((item) => `<li>${renderInline(item)}</li>`)
    .join("");

  return { name, details };
}

function buildDocument(markdown) {
  const blocks = parseMarkdown(markdown);
  const firstHeadingIndex = blocks.findIndex(
    (block) => block.type === "heading" && block.level === 1,
  );

  if (firstHeadingIndex === -1) {
    throw new Error("Le fichier Markdown ne contient aucun titre principal.");
  }

  const firstHeading = blocks[firstHeadingIndex];
  let title = firstHeading.text;
  let bodyStart = firstHeadingIndex + 1;

  if (firstHeading.text.toLowerCase().startsWith("dossier technique")) {
    const roleIndex = blocks.findIndex(
      (block, index) =>
        index > firstHeadingIndex &&
        block.type === "heading" &&
        block.level === 2,
    );

    if (roleIndex !== -1) {
      title = blocks[roleIndex].text;
      bodyStart = roleIndex + 1;
    }
  }

  const summaryIndex = blocks.findIndex(
    (block, index) => index >= bodyStart && block.type === "paragraph",
  );
  const summary = summaryIndex === -1 ? "" : blocks[summaryIndex].text;
  const sectionBlocks = blocks.filter(
    (block, index) =>
      index > summaryIndex &&
      !(block.type === "heading" && block.level === 1),
  );
  const sections = groupByHeading(sectionBlocks, 2);
  const profileSection = sections.find(
    (section) => sectionId(section.title) === "profil",
  );
  const profile = profileData(profileSection);

  const html = sections
    .filter((section) => sectionId(section.title) !== "profil")
    .sort((first, second) => {
      const firstOrder = SECTION_ORDER[sectionId(first.title)] ?? 99;
      const secondOrder = SECTION_ORDER[sectionId(second.title)] ?? 99;
      return firstOrder - secondOrder;
    })
    .map((section) => {
      const id = sectionId(section.title);
      if (id === "competences") return renderSkillsSection(section, id);
      if (id === "experiences") return renderExperiencesSection(section, id);
      return renderStandardSection(section, id);
    })
    .join("");

  return { title, summary, name: profile.name, details: profile.details, html };
}

function profileFromUrl() {
  const requested = new URLSearchParams(window.location.search).get("profil");
  return Object.hasOwn(PROFILES, requested) ? requested : "fullstack";
}

function styleFromUrl() {
  const requested = new URLSearchParams(window.location.search).get("style");
  return Object.hasOwn(STYLES, requested) ? requested : "elegant";
}

function applyStyle(style) {
  const safeStyle = Object.hasOwn(STYLES, style) ? style : "elegant";
  document.documentElement.dataset.style = safeStyle;
  styleSelect.value = safeStyle;
}

function updateUrl({ profile = profileSelect.value, style = styleSelect.value }) {
  const url = new URL(window.location.href);

  if (profile === "fullstack") {
    url.searchParams.delete("profil");
  } else {
    url.searchParams.set("profil", profile);
  }

  if (style === "elegant") {
    url.searchParams.delete("style");
  } else {
    url.searchParams.set("style", style);
  }

  window.history.pushState({ profile, style }, "", url);
}

async function loadProfile(profile) {
  const safeProfile = Object.hasOwn(PROFILES, profile) ? profile : "fullstack";
  profileSelect.value = safeProfile;
  presentation.setAttribute("aria-busy", "true");
  content.setAttribute("aria-busy", "true");
  content.innerHTML =
    `<p class="loading-message" role="status">Chargement du contenu…</p>`;

  try {
    const response = await fetch(PROFILES[safeProfile], { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Impossible de charger ${PROFILES[safeProfile]}.`);
    }

    const documentContent = buildDocument(await response.text());
    personName.textContent = documentContent.name || "Maxence Roques";
    profileTitle.textContent = documentContent.title;
    profileSummary.textContent = documentContent.summary;
    profileDetails.innerHTML = documentContent.details;
    content.innerHTML = documentContent.html;
    document.title =
      `${documentContent.title} - ${documentContent.name || "Maxence Roques"}`;
    document
      .querySelector('meta[name="description"]')
      .setAttribute("content", documentContent.summary);
  } catch (error) {
    personName.textContent = "Maxence Roques";
    profileTitle.textContent = "Contenu indisponible";
    profileSummary.textContent = "";
    profileDetails.innerHTML = "";
    content.innerHTML =
      `<p class="error-message" role="alert">` +
      `Le fichier de la version ${PROFILE_LABELS[safeProfile]} n’a pas pu être ` +
      `chargé. Ouvrez le site depuis un serveur web local ou réessayez plus tard.` +
      `</p>`;
    console.error(error);
  } finally {
    presentation.setAttribute("aria-busy", "false");
    content.setAttribute("aria-busy", "false");
  }
}

profileSelect.addEventListener("change", () => {
  updateUrl({ profile: profileSelect.value });
  loadProfile(profileSelect.value);
});

styleSelect.addEventListener("change", () => {
  applyStyle(styleSelect.value);
  updateUrl({ style: styleSelect.value });
});

pdfExportButton.addEventListener("click", () => {
  const profile = Object.hasOwn(PROFILES, profileSelect.value)
    ? profileSelect.value
    : "fullstack";
  const style = Object.hasOwn(STYLES, styleSelect.value)
    ? styleSelect.value
    : "elegant";
  const parameters = new URLSearchParams({ profil: profile, style });
  const downloadLink = document.createElement("a");

  downloadLink.href = `/api/pdf?${parameters.toString()}`;
  downloadLink.download = `cv-maxence-${profile}-${style}.pdf`;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
});

window.addEventListener("popstate", () => {
  applyStyle(styleFromUrl());
  loadProfile(profileFromUrl());
});

applyStyle(styleFromUrl());
loadProfile(profileFromUrl());
