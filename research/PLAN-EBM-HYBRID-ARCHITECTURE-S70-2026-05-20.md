---
session: S70
date: 2026-05-20
theme: ebm-hybrid-architecture-couche-2-scope
project: eclectique-browser-mcp
chain_id: browser-mcp
chain_seq: 11
status: spec-locked-pending-implementation
type: scope-decision-architecture-plan
tags: [ebm, hybrid, couche-2, css-extract, gap-fill, auto-layout, effects, viewport-matrix, complex-cynefin]
parent_session: "[[S69-2026-05-18-ebm-visual-hybrid-pivot-decision]]"
related:
  - "[[PROBE-EBM-VISUAL-HYBRID-S69-2026-05-18]]"
  - "[[HTMLTODESIGN-ECOSYSTEM-S60]]"
  - "[[s70-d1-ebm-couche-2-gap-fill-scope-locked]]"
---

# PLAN — EBM Hybrid Architecture Couche 2 Scope — S70

## TL;DR

S70 brainstorm session locked **Couche 2 = gap-fill existing emit (NOT refonte from scratch)**. Re-baseline triggered by README v0.10.3 + S60 evidence : EBM extracts already gradients linear/radial, pseudo `::before`/`::after`, fonts CSS-first stack, SVG outerHTML, image bitmaps via `upload_assets`. Gap user-rejet S69 ("structure brute") = emit fidelity layers absent (layout / text props / Effects / backgrounds / pseudo render) — NOT extract pipeline.

**Couche 2 scope locked S70** (~5.5-8j cumul TP) :
- **Q2 Layout** : Full Grid+Flex → Auto-Layout mapper (2-3j)
- **Q3 Visual depth** : 3 buckets + pseudo emit (2-3j) — text props depth + Effects shadows/blurs + backgrounds multi-layer/blend-mode + pseudo render
- **Q5 Viewport matrix** : Thin wrapper N captures × N themes → N pages 1 Figma file (1.5-2j)

**Deferred Couche 3 S72+** : record_states (#7) Q4, .ebm pack (#2) Q6, annotations (#10), multi-page crawl (#11), SDK npm (#12).

**Ship cadence** : Split 2 waves.
- **S71 → v0.11.0** "Fidelity upgrade" : Q2 layout + Q3 visual depth (~4-6j, coupled `figma_emit.ts`).
- **S72 → v0.12.0** "Viewport matrix" : Q5 thin wrapper (~1.5-2j).

**Pivot S69 constraint preserved** : positioning Internal-only Eclectique agence + Q8 paid SaaS lock-in INACCEPTABLE → Couche 2 strict autonomous (no html-to-design dep).

## Decision chain Q1-Q7 (DOCTRINE #1 A/B/C V2.3)

| # | Question | Choice | TP |
|---|---|---|---|
| Q1 | Re-baseline 2c | A — Gap-fill existing emit | 3-7j envelope |
| Q2 | Layout fidelity | A — Full Grid+Flex → Auto-Layout mapper | 2-3j |
| Q3 | Visual props depth | A — Comprehensive 3 buckets + pseudo | 2-3j |
| Q4 | record_states scope | A — Defer Couche 3 S72+ | 0j S70 |
| Q5 | Viewport matrix | A — Thin wrapper above figma_emit | 1.5-2j |
| Q6 | .ebm pack | A — Defer Couche 3 S72+ | 0j S70 |
| Q7 | Wave cadence | A — Split 2 waves (S71 + S72) | — |

Entry gates pre-Q1 (S70 turn opening) :
- **EBM positioning** : Internal-only Eclectique agence (1-2 users)
- **Q8 PROBE paid SaaS lock-in** : Inacceptable → seul 2c CSS extract pur viable
- **Method** : Skill `superpowers:brainstorming`

Final delegation Option 0 V2.3 from user : "je te fais confiance termine le reste pour ship" — sections 2-6 + PLAN.md write + decision save + writing-plans handoff procèdent avec recos par défaut.

## Architecture — 3 couches

### Couche 1 — Capture (EBM existing, unchanged S70)

Patchright stealth scrape (S62 v0.9.0). Persistent user-data-dir auth session (S61 v0.8.0 `seed_auth`). Source XOR : `url` / `html` / `html_path` (S61 v0.7.0). Output : `Bundle v1.2.0`.

Extractors (`src/extractors/`) :
- `a11y.ts` — accessibility tree
- `figma.ts` (11.8K) — FigmaFrame schema (FRAME/GROUP/TEXT/RECTANGLE/VECTOR + SOLID/GRADIENT_LINEAR/GRADIENT_RADIAL paints + cornerRadius)
- `htmltoclaude.ts` (18.3K) — HTML extractor + Claude DSL
- `screenshot.ts` — Patchright screenshot
- `tokens.ts` (7.1K) — design tokens (colors + fonts CSS-first stack + @font-face URLs)

Lib (`src/lib/`) :
- `browser.ts` (4.1K) — Patchright launch + viewport (`newPageForViewport` S62)
- `cookies.ts` (4.1K)
- `figma_emit.ts` (18.1K) — current Plugin API emit (gap-fill S70 target)
- `source.ts` (6.0K)
- `untrusted.ts` (693B)
- `urlGuard.ts` (2.1K)

### Couche 2 — Visual emit (S70 SCOPE LOCKED — gap-fill `figma_emit.ts` + viewport wrapper)

#### Q2 — Layout (Full Grid+Flex → Auto-Layout mapper)

**Current state (v0.10.3)** : `figma_emit.ts` emits FRAMEs with absolute coords via `getBoundingClientRect()`. No Auto Layout semantics.

**Target (v0.11.0)** : Walk computed CSS during extract, emit `AutoLayoutMixin` per container.

Extract layer (`src/extractors/figma.ts`) per element :
```ts
{
  layoutMode: 'HORIZONTAL' | 'VERTICAL' | 'NONE',  // from display:flex/grid + flex-direction
  primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN',  // justify-content
  counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE',  // align-items
  itemSpacing: number,  // gap | column-gap | row-gap
  paddingTop, paddingRight, paddingBottom, paddingLeft: number,
  layoutSizingHorizontal, layoutSizingVertical: 'FIXED' | 'HUG' | 'FILL',  // width/height vs auto/100%
}
```

Mapping rules :
- `display:flex; flex-direction:row` → `layoutMode:'HORIZONTAL'`
- `display:flex; flex-direction:column` → `layoutMode:'VERTICAL'`
- `display:grid` → nested auto-layout (rows = VERTICAL outer, columns = HORIZONTAL inner). `grid-template-columns: 1fr 1fr 1fr` → 3 HUG children. `grid-template-areas` preserved as Figma layer names.
- `justify-content: flex-start|center|flex-end|space-between` → `primaryAxisAlignItems: MIN|CENTER|MAX|SPACE_BETWEEN`
- `align-items: stretch` → counter axis FILL
- `gap`/`column-gap`/`row-gap` → `itemSpacing` (primary axis) ; cross axis spacing requires separate handling
- `padding` (4 sides) → `paddingTop|Right|Bottom|Left`
- `width:auto` / `height:auto` → `HUG_CONTENTS`
- `width:100%` / `flex:1` → `FILL_CONTAINER`
- explicit `width:Npx` → `FIXED`

Emit layer (`src/lib/figma_emit.ts`) emits per node :
```js
const node = figma.createFrame();
node.layoutMode = ...;
node.primaryAxisAlignItems = ...;
node.counterAxisAlignItems = ...;
node.itemSpacing = ...;
node.paddingTop = node.paddingRight = node.paddingBottom = node.paddingLeft = ...;
node.layoutSizingHorizontal = 'HUG' | 'FILL' | 'FIXED';
```

Fallback : if `display:block|inline|inline-block` or computed layout ambiguous, fallback `layoutMode:'NONE'` (current absolute coords behavior preserved).

#### Q3 — Visual depth (3 buckets + pseudo emit)

**Bucket (a) Text props depth** — extract `getComputedStyle()` per TEXT node :
```ts
{
  letterSpacing: number,  // CSS letter-spacing → Figma TextNode.letterSpacing.value (px unit)
  lineHeight: number | 'AUTO',  // CSS line-height → Figma TextNode.lineHeight.value (px or PERCENT)
  textDecoration: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH',  // CSS text-decoration-line
  textCase: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE',  // CSS text-transform applied at extract IF text-transform present (Figma supports textCase property but text-transform stronger semantics — apply at extract pre-transform stage)
  // text-shadow → emit as DropShadowEffect on TextNode (multi-shadow stack supported)
}
```

**Bucket (b) Effects** — extract per element :
- `box-shadow` (multi-shadow CSV) → emit each as `DropShadowEffect` (positive `inset` → `InnerShadowEffect`) in `effects[]` array
- `filter:blur(Npx)` → `LayerBlurEffect { radius: N }`
- `backdrop-filter:blur(Npx)` → `BackgroundBlurEffect { radius: N }`
- Mapping CSS → Figma :
  ```ts
  {
    type: 'DROP_SHADOW',
    visible: true,
    color: { r, g, b, a },  // from box-shadow color (rgba)
    offset: { x: offsetX, y: offsetY },
    radius: blurRadius,
    spread: spreadRadius,
    blendMode: 'NORMAL',
  }
  ```

**Bucket (c) Backgrounds multi-layer + blend** — extract per element fills array :
- Multi-bg CSV `background-image: url(a), linear-gradient(...), url(b)` → fills array `[ImagePaint, GradientPaint, ImagePaint]` stacked correct order (CSS first declared = topmost in Figma fills array — REVERSE order, since Figma fills paint last on top)
- `background-blend-mode` per layer → `Paint.blendMode`
- `background-image: url()` resolved via existing `upload_assets` pipeline pattern (S67 v0.10.3) — extract collects bg URLs as image targets, emit emits RECT placeholders `IMAGE_BG:` prefix, top-level `image_targets[]` aggregate, client loop uploads each
- `background-size: cover|contain` → `Paint.scaleMode: 'FILL' | 'FIT'`
- `background-position: center` → `Paint.imageTransform` 2×3 matrix

**Bucket (d) Pseudo emit** — `::before`/`::after` extracted S60 v0.6.0 currently dropped in emit. New : emit each pseudo as Figma child node inside parent frame (positioned via computed coords). Inherit parent layout context (auto-layout if applicable, else absolute).

Pseudo content rules :
- `content: ''` (empty) → emit RECT with computed background (often decoration line/dot)
- `content: 'text'` (textual) → emit TEXT node
- `content: url()` → emit RECT with bg-image (upload_assets path)
- `content: counter()` → emit TEXT with resolved counter value (pre-resolved at extract since DOM API can't read pseudo content without `getComputedStyle(el, '::before').content`)

#### Q5 — Viewport matrix (Thin wrapper above figma_emit)

**Architecture** : Orchestration layer in new `src/tools/to_figma_script.ts` or new helper `src/lib/viewport_matrix.ts`.

```ts
async function emitViewportMatrix(opts: {
  source: SourceInput,
  viewports: ViewportConfig[],  // [{name:'desktop', w:1440, h:900, theme:'light'}, ...]
  fileKey: string,
}) {
  const results = [];
  for (const vp of opts.viewports) {
    const page = await newPageForViewport(vp.w, vp.h);  // S62 v0.9.0 existing
    await page.emulateMedia({ colorScheme: vp.theme });  // light|dark
    const bundle = await captureBundle(page, opts.source);
    const emit = await figmaEmit(bundle, { pageName: `${vp.name}_${vp.theme}_${vp.w}` });
    results.push({ viewport: vp, emit });
  }
  return { type: 'multi-viewport-emit', pages: results };
}
```

Output structure decision (delegated default Option 0) : **N pages in single Figma file** (cleanest navigation, reuses chunk emit pattern S66 — page per viewport). Alternative N frame-groups single page rejected (would crowd single page + crowding harder to navigate).

Default viewport set :
```ts
[
  { name: 'desktop', w: 1440, h: 900, theme: 'light' },
  { name: 'desktop', w: 1440, h: 900, theme: 'dark' },
  { name: 'tablet',  w: 768,  h: 1024, theme: 'light' },
  { name: 'tablet',  w: 768,  h: 1024, theme: 'dark' },
  { name: 'mobile',  w: 375,  h: 812, theme: 'light' },
  { name: 'mobile',  w: 375,  h: 812, theme: 'dark' },
]
```

Configurable via `to_figma_script` tool input `viewports?: ViewportConfig[]` (defaults applied if omitted). Single-viewport ship cadence (S71 v0.11.0) keeps current 1-viewport default ; multi-viewport opt-in S72 v0.12.0.

### Couche 3 — Features uniques (Deferred S72+)

Out-of-scope S70-S72 ship. Listed for roadmap visibility :

| Feature | Source | Strategy | Depends on |
|---|---|---|---|
| record_states (#7) | S60 steal #7 + PROBE Q3 | Wrap Couche 2 emit N times per interactive state → Figma Component variants | Couche 2 v0.12.0 ship |
| .ebm pack (#2) | S60 steal #2 + PROBE Q5 | Versioned tar/zip + assets manifest + screenshot sidecar wrap Bundle v1.2.0 | Couche 2 ship |
| Animation annotations (#10) | S60 steal #10 | Detect `transition`/`@keyframes`/`animation-*` CSS → emit Figma comments + parallel `animations.json` sidecar | Couche 2 ship — no competitor does this |
| Multi-page crawl (#11) | S60 bonus #11 | Sitemap.xml seed → N pages per route + working prototype links | Couche 2 ship + .ebm pack |
| SDK npm (#12) | S60 bonus #12 | `@ebm/sdk` package — third-party tools feed into EBM | Couche 2 + .ebm pack + record_states |

## Components & data flow Couche 2 ship

```
Patchright session
  └─ captureBundle(source, viewport) ──► Bundle v1.2.0
                                            │
                                            ▼
                          extractors/{figma, tokens, htmltoclaude}.ts
                                            │
                                            ▼
                              Bundle v1.3.0 (S70 schema bump)
                              ├── computed.layout: AutoLayoutMixin per node  ← NEW Q2
                              ├── computed.text: TextProps depth per TEXT  ← NEW Q3a
                              ├── computed.effects: Effects[] per node  ← NEW Q3b
                              ├── computed.fills: Paint[] multi-layer + blend  ← NEW Q3c
                              ├── computed.pseudo: PseudoNode[] children  ← NEW Q3d
                              └── (existing : gradients, fonts, SVG, image_targets)
                                            │
                                            ▼
                                lib/figma_emit.ts (v2)
                                            │
                                            ▼
                          Plugin API JS string + recipe.md
                                            │
                                            ▼ S72 v0.12.0 only
                          lib/viewport_matrix.ts wrapper  ← NEW Q5
                                            │
                                            ▼
                            use_figma paste → Figma file
                            (N pages if multi-viewport)
```

**Bundle schema bump** : v1.2.0 → v1.3.0 S70. Add `computed.{layout, text, effects, fills, pseudo}` per node. Breaking change downstream `to_figma_script` emit ; smoke tests need update.

## Wave plan + TP estimate

### S71 — v0.11.0 "Fidelity upgrade" (Q2 layout + Q3 visual depth)

**TP estimate : 4-6j** (coupled gap-fill `figma_emit.ts` + `src/extractors/figma.ts`).

Phases :
1. **Q2 Layout extract + emit** (~2-3j)
   - Extract : `figma.ts` walk computed layout per element → AutoLayoutMixin schema
   - Emit : `figma_emit.ts` emit `layoutMode` / `primary|counterAxisAlignItems` / `itemSpacing` / `padding` per FRAME
   - Schema bump : Bundle v1.3.0 add `computed.layout`
   - Tests : `smoke:script:full` adapted ; new probe `test/probe-autolayout-flexbox.ts` + `test/probe-autolayout-grid.ts` ; live re-test Awwwards SOTD vs S69 baseline
2. **Q3 Visual depth extract + emit** (~2-3j)
   - Extract Bucket (a) text props : `tokens.ts` extend
   - Extract Bucket (b) Effects : new helper `src/extractors/effects.ts`
   - Extract Bucket (c) bg multi-layer : extend `figma.ts` fills array logic
   - Extract Bucket (d) pseudo : pseudo nodes already extracted S60, lift to emit pipeline
   - Emit : `figma_emit.ts` extend per bucket
   - Tests : 4 new probes per bucket ; live re-test Awwwards SOTD + 1 site complexe (Stripe homepage ou Linear landing)

Ship criteria S71 :
- All smokes 8/8 PASS post-changes
- Live Awwwards SOTD re-test : auto-layout visible Figma file vs S69 absolute frames
- Bundle schema v1.3.0 documented README + migration note
- v0.11.0 README ship section drafted
- Handoff S71

### S72 — v0.12.0 "Viewport matrix" (Q5 thin wrapper)

**TP estimate : 1.5-2j**.

Phases :
1. **Q5 Viewport matrix wrapper** (~1.5-2j)
   - New `src/lib/viewport_matrix.ts` orchestration
   - New tool `to_figma_script_matrix` OR extend existing `to_figma_script` input `viewports?: []`
   - Default viewport set (6 = desktop/tablet/mobile × light/dark)
   - Output N pages in single Figma file via existing chunk pattern (S66 v0.10.2)
   - Tests : `smoke:viewport-matrix` new ; live re-test Awwwards SOTD 6 pages
2. Ship criteria : Awwwards SOTD live = 6 pages 1 Figma file, smokes pass, README v0.12.0 section drafted, handoff S72

### Cumul cadence

| Wave | Session | Version | Scope | TP | Ship |
|---|---|---|---|---|---|
| 1 | S71 | v0.11.0 | Fidelity upgrade (Q2+Q3) | 4-6j | "AutoLayout + Effects + multi-bg + pseudo render" |
| 2 | S72 | v0.12.0 | Viewport matrix (Q5) | 1.5-2j | "6 frames 1 capture" |
| **Cumul Couche 2** | **S71-S72** | **v0.11.0 + v0.12.0** | **Couche 2 complete** | **5.5-8j** | — |
| 3+ | S73+ | v0.13.0+ | Couche 3 features | — | record_states / .ebm pack / annotations / etc. |

## Risk register + mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Auto-Layout mapping fidelity ambiguous (CSS Grid → nested AutoLayout lossy) | High | High | Live A/B re-test S69 Awwwards SOTD baseline. Fallback `layoutMode:'NONE'` if ambiguous. Manual cleanup acceptable 5-15% (S60 industry ceiling) |
| R2 | Effects multi-shadow stack order regression | Mid | Mid | Per-effect smoke test. CSS box-shadow stacks bottom-up, Figma effects array order matters — explicit reverse if needed |
| R3 | Multi-bg URL resolution scale (N urls × N viewports) | Mid | Mid | Reuse S67 v0.10.3 `upload_assets` pattern (already battle-tested 1 image S67). Throttle parallel uploads |
| R4 | Bundle schema v1.3.0 breaking downstream tools/test suite | High | Mid | Migration shim : v1.2.0→v1.3.0 transparent default if `computed.layout` etc. absent. Smokes 8/8 must pass pre-ship |
| R5 | Viewport matrix N×emit doubles context burn (use_figma chunk size × N) | Mid | High | Solo viewport ship default v0.12.0 (opt-in matrix). Per-page emit independent (existing chunk pattern preserved). P2 transport robustness (Bun-side stdio wrapper) prioritized parallel if needed |
| R6 | Pseudo render placement (absolute vs auto-layout context) | Mid | Mid | Inherit parent layout context. Pseudo before/after as first/last child. Live test with site using `::before` decoration heavy (e.g. Tailwind component lib) |
| R7 | Token economy regression Couche 2 emit vs v0.10.3 | Mid | High | Computed CSS per node = bigger payload than current. Measure smoke bundle size delta. Cap `max_nodes` (existing override S60) doctrine + chunked emit (existing) handle scale |
| R8 | Scope creep S71 wave (Q2+Q3 coupled 4-6j upper bound) | Mid | High | Sterile-cockpit ST-04 auto-activate (schema migration trigger). SITREP mid-wave $/h check. Defer Q3 buckets sub-decomposable to S72 if Q2 alone hits 4j |
| R9 | Live html-to-design output not bypassable for QA reference | Low | Low | h2d ref S69 file `d37IFjeESbhGHl6RGhFBp5` preserved. Free tier 10 imports/30d limit OK for QA-only |
| R10 | Patchright UDD-reuse caveats (hang post 3+ launches) | Low | Mid | Fixed S62 v0.10.1 via `newPageForViewport()`. Confirmed PASS 5/5 probe. Re-test viewport matrix S72 |

## Testing strategy

### Smoke tests (existing 8/8 PASS — preserve)

- `smoke` — base bundle
- `smoke:claude` — to_claude DSL
- `smoke:figma` — Figma REST JSON
- `smoke:paste` — html paste input
- `smoke:fonts` — fonts v0.8 extractor
- `smoke:script` — to_figma_script emit
- `smoke:script:slim` — minimal emit
- `smoke:script:full` — 181-node Awwwards SOTD chunked + substitution

### New tests S71 (Q2 + Q3)

| Test | Scope | File |
|---|---|---|
| `smoke:autolayout-flexbox` | Q2 — flex container mapping | `test/smoke-autolayout-flexbox.ts` |
| `smoke:autolayout-grid` | Q2 — CSS Grid → nested AutoLayout | `test/smoke-autolayout-grid.ts` |
| `smoke:text-props` | Q3a — letter-spacing/line-height/decoration | `test/smoke-text-props.ts` |
| `smoke:effects` | Q3b — box-shadow + filter blur | `test/smoke-effects.ts` |
| `smoke:multi-bg` | Q3c — multi-layer bg + blend-mode | `test/smoke-multi-bg.ts` |
| `smoke:pseudo-render` | Q3d — `::before`/`::after` emit | `test/smoke-pseudo-render.ts` |
| `smoke:script:full` | regression Awwwards SOTD post-changes | existing, updated |

### New tests S72 (Q5)

| Test | Scope | File |
|---|---|---|
| `smoke:viewport-matrix` | Q5 — 6 viewports × themes | `test/smoke-viewport-matrix.ts` |
| Live re-test | Awwwards SOTD 6 pages 1 Figma file | manual |

### Live regression S71 + S72

- Awwwards SOTD baseline file `yFJNjHzCXWEk4gaGOmLzSA` (S69) preserved for diff.
- Side-by-side comparison post-S71 v0.11.0 ship : new Figma file vs old. User-visible "structure brute" gap closed Y/N.
- 1 complex site additional regression (Stripe / Linear / Vercel landing).

## Out-of-scope (Couche 3 S72+)

Deferred per Q4+Q6 decisions :

1. **record_states (#7)** — interactive state capture (modal/form-error/accordion/wizard) → Figma Component variants. Strategy : wrap Couche 2 emit N times (1 bundle per state) + variant-grouping post.
2. **.ebm pack format (#2)** — versioned tar/zip + assets manifest + screenshot sidecar. Re-importable, diffable, dev-handoff portable.
3. **Animation annotations (#10)** — `transition`/`@keyframes`/`animation-*` → Figma comments + `animations.json` sidecar. No competitor solves.
4. **Multi-page crawl (#11)** — sitemap.xml seed → N pages 1 Figma file + prototype links.
5. **SDK npm (#12)** — `@ebm/sdk` package — third-party tools integration.
6. **Component detection (#6)** — repeating DOM subtrees → Figma Components + Instances dedup. Industry gap.
7. **CSS Grid named-regions** — `grid-template-areas` → preserved Figma layer names. Sub-feature Q2 extension.

## Open items future (post-Couche 2)

- TP estimate Couche 3 each feature TBD per S72+ brainstorm sessions.
- `code.to.design` API parity strategic decision (paid SaaS engine competitor — relevant if EBM SDK ships #12).
- AI-assisted component dedup (#6) — uses cheap-worker delegation (Gemini Flash/Haiku) per DOCTRINE #3 V2.
- Doctrine ST-07 candidate (S69 retro-eng pattern) "user-final output calibration session 0/1" — separate process work.

## Refs

- PROBE spec : `~/Projects/Eclectique/eclectique-browser-mcp/research/PROBE-EBM-VISUAL-HYBRID-S69-2026-05-18.md`
- Recon S60 : `~/Projects/Eclectique/eclectique-browser-mcp/research/HTMLTODESIGN-ECOSYSTEM-S60.md`
- Handoff S69 : `~/Vault/Obsidian-Brain/10-Sessions/2026/05/S69-2026-05-18-ebm-visual-hybrid-pivot-decision.md`
- Decision card : `~/Vault/Obsidian-Brain/30-Decisions/s70-d1-ebm-couche-2-gap-fill-scope-locked.md`
- EBM README v0.10.3 : `~/Projects/Eclectique/eclectique-browser-mcp/README.md`
- Comparaison live S69 EBM : https://www.figma.com/design/yFJNjHzCXWEk4gaGOmLzSA
- Comparaison live S69 h2d ref : https://www.figma.com/design/d37IFjeESbhGHl6RGhFBp5

## Sign-off

S70 brainstorm session complete. Couche 2 scope LOCKED gap-fill 3 buckets + viewport wrapper. Ship cadence 2 waves S71 (v0.11.0) + S72 (v0.12.0) cumul ~5.5-8j. Couche 3 deferred S72+ post Couche 2 stable.

Transition next : `superpowers:writing-plans` skill invoked → implementation plan PHASE-S71-v0.11.0.md.
