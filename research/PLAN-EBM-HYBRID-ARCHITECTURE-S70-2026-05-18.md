---
session: S70
date: 2026-05-18
theme: ebm-hybrid-architecture-2a-2c-staged
project: eclectique-browser-mcp
status: plan-locked
type: architecture-decision
tags: [ebm, architecture, hybrid, 2a-passthrough, 2c-css-extract, staged]
related:
  - "[[PROBE-EBM-VISUAL-HYBRID-S69-2026-05-18.md]]"
  - "[[HTMLTODESIGN-ECOSYSTEM-S60.md]]"
  - "[[S69-2026-05-18-ebm-visual-hybrid-pivot-decision]]"
---

# PLAN — EBM Hybrid Architecture S70 — 2a + 2c staged

## Décision S70

**Architecture Couche 2 = Hybride D : 2a primary (passthrough h2d) + 2c fallback (CSS extract standalone)**.

Routing décidé runtime EBM tool selon input (URL public vs localhost/auth/bot-protected).

## Routing logic

```
EBM scrape (Patchright UDD persistent session)
        ↓
   Detect input :
        ├── URL public + no auth + no bot-protect → PATH 2a
        └── localhost OR auth-gated OR bot-protected → PATH 2c
        ↓
   PATH 2a (1-2j TP S71-72) :
        Emit recipe.md =
          Step 1 : mcp__claude_ai_html_to_design__import-url({url, viewport})
          Step 2 : use_figma(plugin_api_code_features_uniques)
        Output : Figma file = h2d visual + Couche 3 features overlay
        ↓
   PATH 2c (10-15j TP S75+ defer) :
        EBM Patchright capture getComputedStyle() per node
        Bundle schema bump v1.4.0 : include resolved CSS
        figma_emit.ts : fills/strokes/effects/auto-layout résolus
        Emit Plugin API code standalone (zero h2d call)
        Output : Figma file = visual EBM standalone
```

## Open Questions (PROBE S69) — resolutions

| # | Question | Resolution Hybride D |
|---|---|---|
| 1 | h2d free tier 10/30d bloquant ? | User-side concern. EBM agnostic. Recipe.md surface warning "Free tier may apply". 2c path always available no quota. |
| 2 | Couche 1+2 Z-order conflict ? | NON applicable Hybride D. 2a = h2d only, 2c = EBM only. Either-or, pas overlay simultané. |
| 3 | record_states scope (#7) ? | Applique Couche 1 struct via Patchright `forcePseudoState` (CDP). 2a recipe emit h2d per state + variants. 2c emit Plugin API code variants direct. |
| 4 | viewport matrix h2d compat (#3) ? | 2a leverages h2d native multi-viewport (free feat). 2c EBM Patchright `emulate()` matrix multiple captures. Symmetric. |
| 5 | .ebm pack scope (#2) ? | Sidecar = struct JSON + screenshot + URL + routing hint (`h2d_eligible: true/false`). Re-import via tool flag. |
| 6 | Bot-protected fallback ? | Hybride D trigger 2c automatic sur bot detection. Patchright bypass + 2c emit. |
| 7 | Localhost / auth-gated ? | Hybride D trigger 2c automatic sur localhost detection (host:port) ou auth (401/403 OR cookie required). |
| 8 | Licence lock-in acceptable ? | Hybride D mitigates : 2c standalone path always available. Pas full lock-in. Business hedge. |

## TP staging

### S71-72 — 2a passthrough ship (1-2j TP)

**Scope minimal viable** :
- New MCP tool OR extend `to_figma_script` avec `--via-h2d` flag
- Detect input cleanliness (URL public, no localhost, no auth indicators, no bot-protect hints)
- Emit recipe.md contenant :
  - Step 1 : `mcp__claude_ai_html_to_design__import-url` invocation with viewport hint
  - Step 2 : `use_figma` Plugin API for Couche 3 features uniques (lazy si Couche 3 pas encore impl)
- Test smoke : Awwwards SOTD `import-url` happy path recipe ship + manual Claude.ai validate
- Update README `v0.11.0` changelog

**Out of scope S71-72** :
- 2c implementation (defer S75+)
- Features Couche 3 (#7/#3/#2) — restent backlog post Couche 2 stable
- Multi-viewport recipe (free h2d feature mais validate plus tard)

### S75+ — 2c CSS extract fallback (10-15j TP)

**Scope grosse refonte** :
- Patchright capture extension : `getComputedStyle()` per node + serialize
- Bundle schema bump `v1.4.0` : include resolved CSS in node payload
- `figma_emit.ts` : handle resolved fills (gradient/color/image), strokes, effects (shadows/blur), auto-layout mapper (flex/grid → Figma auto-layout)
- Routing logic in EBM tool : detection localhost/auth/bot-protected → 2c emit
- Test coverage : localhost example, auth-gated site (Linear inbox cookie reuse S62), bot-protected (Cloudflare site)
- TP estimate breakdown :
  - 3j computed CSS capture + serialize
  - 3j fills/strokes/effects emit
  - 4j auto-layout mapper flex/grid
  - 2j routing + detection
  - 2j test coverage + smoke

**Defer rationale** : 2a ship rapide validates user pivot expectation visual. 2c only triggers on EBM moat cases (localhost/auth/bot). Business need clarity required before investing 10-15j TP.

## Schema impact

| Component | S71-72 (2a) | S75+ (2c) |
|---|---|---|
| Bundle schema | v1.3.x current | v1.4.0 bump (resolved CSS) |
| `to_figma_script` tool | extend `--via-h2d` flag | full split path 2a/2c |
| `figma_emit.ts` | no change Couche 2 (recipe emit) | major rewrite resolved CSS |
| Patchright capture | no change | extend computed style serialize |
| Recipe.md template | new template h2d path | conditional template |
| Tests | smoke 2a recipe ship | smoke localhost + auth + bot |

## Failure modes documented

1. **2a h2d outage** — si h2d MCP plugin down, 2a recipe fail. Hybride D fallback 2c (mais 2c not impl S71-72). Workaround S71-72 : recipe.md note "If h2d unavailable, defer 2c S75+".
2. **2a viewport mismatch** — h2d default viewport ≠ user expected. Recipe emit explicit viewport hint per node.
3. **2c parity gap** — 2c CSS extract output ≠ h2d quality. Acceptable tradeoff for moat path. Document delta in recipe.md.
4. **Routing false positive** — site marked bot-protected but actually accessible. Override flag `--force-h2d` in tool.
5. **Routing false negative** — site fails 2a but EBM thinks public. Fallback recipe.md fault tolerance instruction.

## Doctrine candidate — ST-07 / Doctrine 8

S69 retro-eng pattern : **calibrate user-final output expectation session 0/1, pas session 7**. Inscrire candidate doctrine V2.4 (stress-test concomitant V2.3 S64-S66).

Proposed wording : "Avant chaque phase tech multi-session sur outil produisant output user-final, calibrer attente VISUELLE concrètement (screenshot ref + tool concurrent side-by-side test) session 0 ou 1, pas session 7."

Defer wording exact à doctrine review S71+ (chain doctrine-restructure).

## Liens

- PROBE S69 : `~/Projects/Eclectique/eclectique-browser-mcp/research/PROBE-EBM-VISUAL-HYBRID-S69-2026-05-18.md`
- S60 recon : `~/Projects/Eclectique/eclectique-browser-mcp/research/HTMLTODESIGN-ECOSYSTEM-S60.md`
- Vault card : `~/Vault/Obsidian-Brain/30-Decisions/s70-d1-ebm-hybrid-2a-2c-staged.md`
- Handoff S70 : `~/Vault/Obsidian-Brain/10-Sessions/2026/05/S70-2026-05-18-ebm-hybrid-architecture-decision.md`
- Comparaison live S69 EBM : https://www.figma.com/design/yFJNjHzCXWEk4gaGOmLzSA
- Comparaison live S69 h2d : https://www.figma.com/design/d37IFjeESbhGHl6RGhFBp5
