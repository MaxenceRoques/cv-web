import { masterProfile } from "./content/master-profile.js";
import { profiles } from "./content/profiles.js";

const STYLES = Object.freeze(["tech", "elegant", "ocean", "executive", "minimal"]);
const LAYOUTS = Object.freeze(["multi", "single"]);
const $ = (selector) => document.querySelector(selector);
const profileSelect = $("#profile-select");
const styleSelect = $("#style-select");
const layoutSelect = $("#layout-select");
const presentation = $("#presentation");
const content = $("#contenu");

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function selectedFromUrl(name, allowed, fallback) { const value = new URLSearchParams(window.location.search).get(name); return allowed.includes(value) ? value : fallback; }
function contactLinks() { const p = masterProfile.person; return [[`tel:${p.phone}`, p.phoneLabel], [`mailto:${p.email}`, p.email], [p.linkedin, "LinkedIn"], [p.github, "GitHub"], [p.portfolio, "Portfolio"]].map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join(""); }
function entryHtml(entryId, variant) { const entry = masterProfile.entries[entryId]; const bullets = entry.bullets[variant] || entry.bullets.default; return `<article><h3>${escapeHtml(entry.title)}</h3><p class="entry-date">${escapeHtml(entry.date)}</p><p>${escapeHtml(entry.context)}</p><ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul><p class="tech-stack"><strong>Technologies :</strong> ${escapeHtml(entry.tech)}</p></article>`; }
function listSection(id, title, values) { return `<section aria-labelledby="${id}"><h2 id="${id}">${title}</h2><ul>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`; }
function renderProfile(profileId) {
  const profile = profiles[profileId]; const person = masterProfile.person;
  $("#person-name").textContent = person.name; $("#profile-title").textContent = profile.title; $("#profile-summary").textContent = profile.summary; $("#profile-details").innerHTML = contactLinks();
  $(".profile-photo").hidden = profile.language === "en"; $(".profile-photo").src = person.photo;
  const skills = profile.skills.map(([label, key]) => `<div><dt>${escapeHtml(label)}</dt><dd>${masterProfile.skills[key].map(escapeHtml).join(" · ")}</dd></div>`).join("");
  const english = profile.language === "en";
  content.innerHTML = `<section aria-labelledby="competences"><h2 id="competences">${english ? "Skills" : "Compétences"}</h2><dl>${skills}</dl></section><section aria-labelledby="experiences"><h2 id="experiences">${english ? "Experience & selected projects" : "Expériences & projets sélectionnés"}</h2>${profile.entries.map(([id, variant]) => entryHtml(id, variant)).join("")}</section>${listSection("diplomes", english ? "Education" : "Formation", masterProfile.education)}${listSection("langues", english ? "Languages" : "Langues", masterProfile.languages)}${listSection("informations-complementaires", english ? "Additional information" : "Informations complémentaires", masterProfile.additional)}`;
  document.documentElement.lang = profile.language; document.title = `${profile.title} — ${person.name}`; document.querySelector('meta[name="description"]').setAttribute("content", profile.summary); presentation.setAttribute("aria-busy", "false"); content.setAttribute("aria-busy", "false");
}
function setUrl() { const url = new URL(window.location.href); url.search = new URLSearchParams({ profil: profileSelect.value, style: styleSelect.value, layout: layoutSelect.value }).toString(); window.history.pushState({}, "", url); }
function applySelections() { const profile = selectedFromUrl("profil", Object.keys(profiles), "fullstack-ia-ihm"); const style = selectedFromUrl("style", STYLES, "tech"); const layout = selectedFromUrl("layout", LAYOUTS, "multi"); profileSelect.value = profile; styleSelect.value = style; layoutSelect.value = layout; document.documentElement.dataset.style = style; document.documentElement.dataset.layout = layout; renderProfile(profile); }
profileSelect.addEventListener("change", () => { setUrl(); applySelections(); }); styleSelect.addEventListener("change", () => { setUrl(); applySelections(); }); layoutSelect.addEventListener("change", () => { setUrl(); applySelections(); });
$("#pdf-export-button").addEventListener("click", () => { const suffix = layoutSelect.value === "single" ? "-ats" : ""; const href = `/api/pdf?${new URLSearchParams({ profil: profileSelect.value, style: styleSelect.value, layout: layoutSelect.value })}`; const link = Object.assign(document.createElement("a"), { href, download: `cv-maxence-roques-${profileSelect.value}${suffix}.pdf` }); document.body.append(link); link.click(); link.remove(); });
window.addEventListener("popstate", applySelections); applySelections();
