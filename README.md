# Générateur de CV ciblés — Maxence Roques

Une source de vérité unique génère quatre CV ciblés, chacun disponible en version visuelle et ATS mono-colonne. Le site reste volontairement statique : HTML, CSS, JavaScript et Playwright pour l’export PDF.

## Architecture

- `content/master-profile.js` : faits vérifiés, coordonnées, compétences, expériences et formulations disponibles.
- `content/profiles.js` : sélection et ordre du contenu pour chaque profil ; aucun fait n’y est dupliqué.
- `content/archive/` : contenus Markdown historiques, conservés pour référence, y compris `content-java-angular2.md`.
- `exports/` : PDF produits par la vérification locale (ignorés par Git).
- `tests/verify-pdfs.js` : génère les huit PDF et échoue si l’un comporte plus d’une page.

## Profils

- `fullstack-ia-ihm` : React, Node.js, IA et IHM — français.
- `java-angular` : Java, Spring Boot et Angular — français.
- `saas-automation` : SaaS, automatisation et outils digitaux — français.
- `fullstack-en` : full-stack, TypeScript, Python et IA — anglais.

## Lancement et PDF

```sh
npm install
npx playwright install chromium
npm start
```

Ouvrir `http://localhost:3000`, choisir le profil, le style et la mise en page, puis cliquer sur **Exporter en PDF**. Le mode « Une colonne (ATS) » masque la photo et utilise une seule colonne.

Pour générer et contrôler les quatre versions visuelles et les quatre versions ATS :

```sh
npm run verify:pdf
```

Les fichiers sont écrits dans `exports/`. Le script inspecte les PDF générés et échoue dès qu’un export ne tient pas sur une page A4.

## Adapter un CV à une offre

1. Modifier seulement `content/master-profile.js` pour ajouter un fait vérifié ou une formulation validée.
2. Dans `content/profiles.js`, choisir les compétences, expériences et variantes de puces qui correspondent à l’offre.
3. Réutiliser l’un des quatre profils : ne pas créer un nouveau fichier de contenu dupliqué.
4. Lancer `npm run verify:pdf` avant l’envoi.
