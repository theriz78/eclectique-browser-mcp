---
session: S69
date: 2026-05-18
theme: ebm-visual-hybrid-pivot
project: eclectique-browser-mcp
status: probe-spec-draft
type: scope-pivot
tags: [ebm, pivot, html-to-design, hybrid, visual-rendering, complex-cynefin]
related:
  - "[[HTMLTODESIGN-ECOSYSTEM-S60.md]]"
  - "[[S68-2026-05-18-ebm-v0.10.3-upload-assets-live-bitmap-gradient-fix]]"
---

# PROBE — EBM Visual Hybrid Pivot — S69

## TL;DR

S69 live comparison Figma:
- **EBM output** (S62-S68 work) = structure DOM brute, ressemble à rien visuellement (frames imbriquées + textes nus + SVG)
- **html-to-design output** (10-min import-url test) = rendu visuel propre, CSS résolu, images, fonts

**User attente livrée** = visuel propre, pas structure nue. Pivot scope EBM décidé : **EBM hybride** = garde capture structure (pour features uniques S60+ : record states / viewport matrix / .h2d portable) MAIS ajoute layer rendu visuel via intégration html-to-design.

**Cynefin** = COMPLEX (2+ inconnues inconnues). Probe spec draft requis avant code.

## Contexte — pourquoi pivot

### EBM scope original (S60-S68)

EBM conçu S60 après recon html-to-design ecosystem. Top 10 gaps identifiés ([HTMLTODESIGN-ECOSYSTEM-S60.md](HTMLTODESIGN-ECOSYSTEM-S60.md)) :
1. No localhost / auth-gated support
2. Complex CSS animations don't transfer
3. Full-page capture flaky
4. Flexbox fidelity "No"
5. SVG handling "Varies"
6. Free tier 10 imports / 30d cap
7. Bot-protected sites fail via URL
8. Font detection brittle
9. Layer nesting bad (admitted 2025)
10. No web components / shadow DOM / iframes / canvas / video

EBM construit pour combler ces gaps via :
- Patchright stealth scrape (bypass bot protection)
- localhost + auth-gated support natif
- Full-page deterministic capture
- SVG native (.svgOuterHtml préservé S60+)
- Token-efficient Plugin API code emit (chunked, idempotent)
- Features prévues : record_states (#7), viewport matrix (#3), .h2d portable (#2)

### Gap implicite découvert S69

S60-S68 focused tech gaps competitor (capture fidelity, bot bypass, features). **MAIS attente utilisateur final** = output Figma visuellement utilisable. Brute DOM structure ne l'est pas. html-to-design malgré gaps ÉCO-tech 1-10 produit output visuel utilisable out-of-box.

**Re-cadrage** : EBM unique value n'est pas "remplacer html-to-design" mais "faire ce que html-to-design fait + features uniques". Visual fidelity = baseline minimum, pas optionnel.

## Architecture hybride proposée

3 couches :

### Couche 1 — Capture (EBM existant, garde)

Patchright scrape page web. Output JSON node bundle (FRAME/GROUP/TEXT/SVG/IMAGE/etc + computed positions + paint shapes minimales). Cette couche reste valeur unique pour features 7/3/2.

### Couche 2 — Visual render (NOUVEAU, via html-to-design)

Au lieu d'emit code Plugin API qui crée frames nues, **emit invocation html-to-design import-url** dans recipe. html-to-design fait le rendu pixel-perfect dans Figma.

3 sous-options techniques (open question) :

**2a) Pur passthrough** — EBM detect "render visual" intent → recipe inclut `mcp__html_to_design__import-url({url})` direct. EBM ne génère plus Plugin API code pour structure. Simple, dépend 100% html-to-design.

**2b) Hybride pixel-perfect overlay** — EBM emit ses frames structure + APPEND html-to-design import sur même fichier, géré comme couche overlay. Permet record_states (Couche 1) tout en gardant visuel propre (Couche 2).

**2c) Computed CSS extraction inside EBM** — EBM patchright capture `getComputedStyle()` complet par node → emit Plugin API code avec fills/strokes/effects résolus. Pas dépendance html-to-design. Mais énorme TP + tokens.

### Couche 3 — Features uniques (S70+, pas bloquant pivot)

Features #7 / #3 / #2 superposent Couche 1 (structure). Functioning unchanged par pivot. Implémentent dans phases ultérieures.

## Open questions (2+ inconnues inconnues → COMPLEX)

1. **html-to-design free tier 10/30d** — bloquant si EBM users pas tier paid ? Comment EBM s'intègre ?
2. **Couche 1 + Couche 2 même fichier** — html-to-design import écrit dans current canvas. EBM emit code aussi current canvas. Conflit Z-order / parent hierarchy ?
3. **record_states feature #7** — interactif states sur structure EBM ou sur rendu html-to-design ? Patchright force pseudo-state appliquée à quoi pour capture ?
4. **viewport matrix feature #3** — `to_claude_matrix` capture multi-viewport. html-to-design supporte multi-viewport ? Ou EBM gère matrice de N captures + N invocations html-to-design ?
5. **.h2d portable artifact feature #2** — pack tout ou sépare structure (Couche 1) + visual refs (Couche 2 html-to-design re-import) ?
6. **Bot-protected sites** — html-to-design fail Cloudflare/CAPTCHA per recon S60. EBM doit-il fallback à Couche 1 pure ? Comment user sait quelle couche utilisée ?
7. **Localhost / auth-gated** — html-to-design no support per recon S60. EBM doit gérer ces cas Couche 1 seule ?
8. **Coût licence** — html-to-design est paid SaaS. EBM dépendance = lock-in fournisseur tiers. Acceptable strat business ?

## Prochaines étapes A/B/C (S70+)

### S70 priorité

**Brainstorm scope hybride** : skill brainstorming A/B/C sur :
- Couche 2 implémentation (2a passthrough / 2b overlay / 2c CSS extract)
- Bornes EBM vs html-to-design (qui gère quoi)
- Pricing / licence stratégie (paid SaaS dépendance acceptable ?)

Output : `research/PLAN-EBM-HYBRID-ARCHITECTURE-S70-YYYY-MM-DD.md`

### S71+ après brainstorm

- Si 2a passthrough → quick refactor EBM (1-2j TP)
- Si 2b overlay → architecture nouvelle Couche 2 (5-7j TP)
- Si 2c CSS extract → grosse refonte emit (10-15j TP, possible Phase 4)

Decision A/B/C sera output brainstorm S70.

## Décision S69 captée

**Décision** : EBM scope élargi de "capture structure + features uniques" à "capture structure + render visuel propre + features uniques".

**Raison** : attente user final = output visuel utilisable. Structure nue rejetée S69 live ("ça ne ressemble pas du tout à ce qu'on avait voulu de base").

**Alternatives considérées** :
- Pivot total html-to-design (abandon EBM) — rejeté : perd features uniques #7/#3/#2 + indépendance tooling
- Continuer EBM pur structure — rejeté : output pas utilisable user final
- Hybride structure + visual layer via html-to-design — **CHOISI** : préserve investissement EBM + comble gap visual

**Preuves** : 
- Test live html-to-design Awwwards SOTD (fichier `d37IFjeESbhGHl6RGhFBp5` node `1:3`) PASS visuel propre
- Test live EBM Awwwards SOTD (fichier `yFJNjHzCXWEk4gaGOmLzSA` page `1:2` 181 nodes) PASS structure mais visuel inutilisable

**Réversible** : oui, scope decision. Implémentation à venir réversible par couche.

**Confidence** : haute sur le pivot, basse sur architecture précise Couche 2 (open).

**Liens** :
- Comparaison live S69 EBM : https://www.figma.com/design/yFJNjHzCXWEk4gaGOmLzSA
- Comparaison live S69 html-to-design : https://www.figma.com/design/d37IFjeESbhGHl6RGhFBp5
- Recon competitor S60 : [HTMLTODESIGN-ECOSYSTEM-S60.md](HTMLTODESIGN-ECOSYSTEM-S60.md)
- Handoff S68 v0.10.3 ship : [[S68-2026-05-18-ebm-v0.10.3-upload-assets-live-bitmap-gradient-fix]]
