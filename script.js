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
function contactLinks(profile) { const p = masterProfile.person; const urls = [[p.linkedin, "linkedin.com/in/maxence-roques"], [p.github, "github.com/MaxenceRoques"], [p.portfolio, "maxenceroques.github.io/portfolio"]]; const location = profile.language === "fr" ? ["#", "Valbonne (06) · Mobile / hybride / remote"] : ["#", "Valbonne, France · Open to hybrid and remote opportunities"]; return [[`tel:${p.phone}`, p.phoneLabel], [`mailto:${p.email}`, p.email], ...urls, location].filter(([href]) => href).map(([href, label]) => href === "#" ? `<li>${label}</li>` : `<li><a href="${href}">${label}</a></li>`).join(""); }
function entryHtml(entryId, variant, showTech, language) { const entry = masterProfile.entries[entryId]; const bullets = entry.bullets[variant] || entry.bullets.default; const localized = language === "en" ? entry.en : entry; const tech = showTech ? `<p class="tech-stack"><strong>${localized.techLabel || "Technologies"}:</strong> ${escapeHtml(entry.tech)}</p>` : ""; return `<article><h3>${escapeHtml(localized.title)}</h3><p class="entry-date">${escapeHtml(localized.date)}</p><p>${escapeHtml(localized.context)}</p><ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>${tech}</article>`; }
function listSection(id, title, values) { return `<section aria-labelledby="${id}"><h2 id="${id}">${title}</h2><ul>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`; }
function renderProfile(profileId) {
  const profile = profiles[profileId]; const person = masterProfile.person;
  $("#person-name").textContent = person.name; $("#profile-title").textContent = profile.title; $("#profile-summary").textContent = profile.summary; $("#profile-details").innerHTML = contactLinks(profile);
  $(".profile-photo").hidden = profile.language === "en"; $(".profile-photo").src = person.photo;
  const skills = profile.skills.map(([label, key]) => { const values = masterProfile.skills[key].filter((value) => !profile.excludedSkills?.includes(value)); return `<div><dt>${escapeHtml(label)}</dt><dd>${values.map(escapeHtml).join(" · ")}</dd></div>`; }).join("");
  const english = profile.language === "en";
  content.innerHTML = `<section aria-labelledby="competences"><h2 id="competences">${english ? "Skills" : "Compétences"}</h2><dl>${skills}</dl></section><section aria-labelledby="experiences"><h2 id="experiences">${english ? "Experience & selected projects" : "Expériences & projets sélectionnés"}</h2>${profile.entries.map(([id, variant, showTech]) => entryHtml(id, variant, showTech, profile.language)).join("")}</section>${listSection("diplomes", english ? "Education" : "Formation", english ? masterProfile.educationEn : masterProfile.education)}${listSection("langues", english ? "Languages" : "Langues", english ? masterProfile.languagesEn : masterProfile.languages)}${listSection("informations-complementaires", english ? "Additional information" : "Informations complémentaires", english ? masterProfile.additionalEn : masterProfile.additional)}`;
  document.documentElement.lang = profile.language; document.title = `${profile.title} — ${person.name}`; document.querySelector('meta[name="description"]').setAttribute("content", profile.summary); presentation.setAttribute("aria-busy", "false"); content.setAttribute("aria-busy", "false");
}
function setUrl() { const url = new URL(window.location.href); url.search = new URLSearchParams({ profil: profileSelect.value, style: styleSelect.value, layout: layoutSelect.value }).toString(); window.history.pushState({}, "", url); }
function applySelections() { const profile = selectedFromUrl("profil", Object.keys(profiles), "fullstack-ia-ihm"); const style = selectedFromUrl("style", STYLES, "tech"); const layout = selectedFromUrl("layout", LAYOUTS, "multi"); profileSelect.value = profile; styleSelect.value = style; layoutSelect.value = layout; document.documentElement.dataset.style = style; document.documentElement.dataset.layout = layout; renderProfile(profile); }
profileSelect.addEventListener("change", () => { setUrl(); applySelections(); }); styleSelect.addEventListener("change", () => { setUrl(); applySelections(); }); layoutSelect.addEventListener("change", () => { setUrl(); applySelections(); });
$("#pdf-export-button").addEventListener("click", () => { const suffix = layoutSelect.value === "single" ? "-ats" : ""; const href = `/api/pdf?${new URLSearchParams({ profil: profileSelect.value, style: styleSelect.value, layout: layoutSelect.value })}`; const link = Object.assign(document.createElement("a"), { href, download: `cv-maxence-roques-${profileSelect.value}${suffix}.pdf` }); document.body.append(link); link.click(); link.remove(); });
window.addEventListener("popstate", applySelections); applySelections();
