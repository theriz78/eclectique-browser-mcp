# EBM Couche 2 Wave 1 (S71 v0.11.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship EBM v0.11.0 "Fidelity upgrade" — close user-rejet S69 "structure brute" via gap-fill of `figma_emit.ts` + extractor pipeline. Adds Auto-Layout mapping (Q2), text props depth + Effects + multi-bg + pseudo render (Q3 4 buckets).

**Architecture:** Extend 3-layer pipeline. **Layer 1** (`src/extractors/htmltoclaude.ts`) enrich `ClaudeNode` schema with computed CSS per node (layout/text_props/effects/bg_fills/pseudo). **Layer 2** (`src/extractors/figma.ts`) map ClaudeNode enriched → FigmaNode with AutoLayoutMixin + effects[] + multi-paint fills + pseudo children. **Layer 3** (`src/lib/figma_emit.ts`) emit Plugin API code for all new props. Bundle schema bumps v1.2.0 → v1.3.0 forward-compat (migration shim for missing fields). 6 new smoke tests (1 per bucket + autolayout-grid). Live regression Awwwards SOTD vs S69 baseline.

**Tech Stack:** Bun runtime, Patchright `^1.59.4` (browser scrape), Plugin API emit (use_figma sandbox), TypeScript `^5`, Zod `^4.4.3` schemas, MCP SDK `^1.29.0`.

**Source spec:** `research/PLAN-EBM-HYBRID-ARCHITECTURE-S70-2026-05-20.md`. Decisions Q1 (gap-fill), Q2 (full Grid+Flex auto-layout), Q3 (3 buckets + pseudo emit). Out-of-scope: Q5 viewport matrix (S72 v0.12.0), Couche 3 features S73+.

**TP estimate:** 4-6j calendar (S71). Phases sequential — Q2 layout foundation first, then Q3 buckets (text/Effects/bg/pseudo).

---

## Pre-flight

### Task 0: Verify clean state + branch

**Files:** working tree state

- [ ] **Step 0.1: Verify clean working tree (only research/PLAN drafts S70 untracked)**

Run: `git status`
Expected: `On branch main`, untracked = `research/PLAN-EBM-HYBRID-ARCHITECTURE-S70-2026-05-20.md` + `research/PHASE-S71-v0.11.0-implementation-plan.md` only. No modified files.

- [ ] **Step 0.2: Create branch v0.11.0-fidelity-upgrade**

Run: `git checkout -b v0.11.0-fidelity-upgrade`
Expected: `Switched to a new branch 'v0.11.0-fidelity-upgrade'`

- [ ] **Step 0.3: Verify Bun + smokes baseline 8/8 PASS**

Run: `bun --version && bun smoke && bun smoke:claude && bun smoke:figma && bun smoke:paste && bun smoke:fonts && bun smoke:script && bun smoke:script:slim && bun smoke:script:full`
Expected: bun `1.x.x` ; all 8 smokes exit 0.

- [ ] **Step 0.4: Verify typecheck baseline clean**

Run: `bun typecheck`
Expected: exit 0, no errors.

- [ ] **Step 0.5: Commit branch start checkpoint**

```bash
git add research/PHASE-S71-v0.11.0-implementation-plan.md research/PLAN-EBM-HYBRID-ARCHITECTURE-S70-2026-05-20.md
git commit -m "docs(s71): add v0.11.0 implementation plan + S70 brainstorm spec

S70 brainstorm output : Couche 2 scope locked gap-fill existing emit.
S71 wave 1 plan : Q2 Auto-Layout + Q3 visual depth 4 buckets.
TP estimate ~4-6j cumul. Ship target v0.11.0.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```
Expected: 1 file committed (PHASE plan + S70 PLAN already in research/).

---

## Phase 1 — Schema bump v1.3.0 (foundation)

### Task 1: Extend ClaudeNode schema with computed CSS surfaces

**Files:**
- Modify: `src/extractors/htmltoclaude.ts` (extend ClaudeNode interface + walker)

- [ ] **Step 1.1: Write failing test for ClaudeNode schema v1.3.0**

Create: `test/probe-claudenode-v1.3.0-schema.ts`

```ts
import { test, expect } from "bun:test";
import type { ClaudeNode } from "../src/extractors/htmltoclaude";

test("ClaudeNode v1.3.0 supports new fields", () => {
  const node: ClaudeNode = {
    id: "n1",
    type: "FRAME",
    box: [0, 0, 100, 100],
    layout: {
      mode: "HORIZONTAL",
      primaryAxisAlign: "SPACE_BETWEEN",
      counterAxisAlign: "CENTER",
      itemSpacing: 16,
      padding: { top: 8, right: 16, bottom: 8, left: 16 },
      sizingH: "HUG",
      sizingV: "FIXED",
    },
    text_props: undefined,
    effects: [],
    bg_fills: [],
    pseudo_before: undefined,
    pseudo_after: undefined,
  };
  expect(node.layout?.mode).toBe("HORIZONTAL");
  expect(node.layout?.padding?.left).toBe(16);
});
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `bun test test/probe-claudenode-v1.3.0-schema.ts`
Expected: FAIL with TypeScript error "Property 'layout' does not exist on type 'ClaudeNode'".

- [ ] **Step 1.3: Extend ClaudeNode interface in htmltoclaude.ts**

In `src/extractors/htmltoclaude.ts`, find existing `ClaudeNode` interface, add new optional fields :

```ts
export interface ClaudeLayout {
  mode: "HORIZONTAL" | "VERTICAL" | "NONE";
  primaryAxisAlign?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlign?: "MIN" | "CENTER" | "MAX" | "BASELINE";
  itemSpacing?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  sizingH?: "FIXED" | "HUG" | "FILL";
  sizingV?: "FIXED" | "HUG" | "FILL";
}

export interface ClaudeTextProps {
  letterSpacing?: number;  // px
  lineHeight?: number | "AUTO";  // px or AUTO
  textDecoration?: "NONE" | "UNDERLINE" | "STRIKETHROUGH";
  textCase?: "ORIGINAL" | "UPPER" | "LOWER" | "TITLE";
  textShadows?: ClaudeEffect[];  // text-shadow → DropShadow on TextNode
}

export interface ClaudeEffect {
  type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
  visible?: boolean;
  color?: { r: number; g: number; b: number; a: number };
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  blendMode?: "NORMAL" | "MULTIPLY" | "SCREEN" | "OVERLAY";
}

export interface ClaudeBgFill {
  type: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "IMAGE";
  raw: string;  // original CSS value for parser (gradient or url(...))
  color?: string;  // CSS color string for SOLID
  blendMode?: "NORMAL" | "MULTIPLY" | "SCREEN" | "OVERLAY" | "DARKEN" | "LIGHTEN";
  scaleMode?: "FILL" | "FIT";
  position?: string;
  size?: string;
}

// extend existing ClaudeNode :
export interface ClaudeNode {
  // ... existing fields preserved (id, type, box, fill, gradient, border, radius, clip, chars, font, weight, color, svg, src, role, children, etc.)
  layout?: ClaudeLayout;
  text_props?: ClaudeTextProps;
  effects?: ClaudeEffect[];
  bg_fills?: ClaudeBgFill[];
  pseudo_before?: ClaudeNode;
  pseudo_after?: ClaudeNode;
}
```

- [ ] **Step 1.4: Run test to verify it passes**

Run: `bun test test/probe-claudenode-v1.3.0-schema.ts`
Expected: PASS, 1 test.

- [ ] **Step 1.5: Run typecheck to verify no regression**

Run: `bun typecheck`
Expected: exit 0.

- [ ] **Step 1.6: Run all existing smokes (regression check)**

Run: `bun smoke && bun smoke:claude && bun smoke:figma && bun smoke:paste && bun smoke:fonts && bun smoke:script && bun smoke:script:slim && bun smoke:script:full`
Expected: 8/8 PASS (schema extension is forward-compat — new fields all optional).

- [ ] **Step 1.7: Commit schema bump**

```bash
git add src/extractors/htmltoclaude.ts test/probe-claudenode-v1.3.0-schema.ts
git commit -m "feat(schema): extend ClaudeNode v1.3.0 with layout/text_props/effects/bg_fills/pseudo

Add interfaces ClaudeLayout / ClaudeTextProps / ClaudeEffect / ClaudeBgFill.
All new fields optional — forward-compat with v1.2.0 bundles.
Foundation for v0.11.0 Q2 + Q3 emit gap-fill.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2: Extend FigmaNode schema with AutoLayoutMixin + effects depth

**Files:**
- Modify: `src/extractors/figma.ts:30-74` (extend FigmaEffect + FigmaNode interfaces)

- [ ] **Step 2.1: Write failing test for FigmaNode v1.3.0 schema**

Create: `test/probe-figmanode-v1.3.0-schema.ts`

```ts
import { test, expect } from "bun:test";
import type { FigmaNode, FigmaEffect } from "../src/extractors/figma";

test("FigmaNode v1.3.0 supports AutoLayoutMixin", () => {
  const node: FigmaNode = {
    id: "n1",
    name: "container",
    type: "FRAME",
    absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
    layoutMode: "HORIZONTAL",
    primaryAxisAlignItems: "SPACE_BETWEEN",
    counterAxisAlignItems: "CENTER",
    itemSpacing: 16,
    paddingTop: 8,
    paddingRight: 16,
    paddingBottom: 8,
    paddingLeft: 16,
    layoutSizingHorizontal: "HUG",
    layoutSizingVertical: "FIXED",
  };
  expect(node.layoutMode).toBe("HORIZONTAL");
  expect(node.paddingLeft).toBe(16);
});

test("FigmaEffect v1.3.0 supports BACKGROUND_BLUR + spread + blendMode", () => {
  const effect: FigmaEffect = {
    type: "BACKGROUND_BLUR",
    visible: true,
    radius: 8,
  };
  const shadow: FigmaEffect = {
    type: "DROP_SHADOW",
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    offset: { x: 0, y: 2 },
    radius: 4,
    spread: 1,
    blendMode: "NORMAL",
  };
  expect(effect.type).toBe("BACKGROUND_BLUR");
  expect(shadow.spread).toBe(1);
});
```

- [ ] **Step 2.2: Run test to verify failure**

Run: `bun test test/probe-figmanode-v1.3.0-schema.ts`
Expected: FAIL — TypeScript missing `layoutMode`, `BACKGROUND_BLUR`, `spread`, `blendMode`.

- [ ] **Step 2.3: Extend FigmaEffect + FigmaNode in figma.ts**

In `src/extractors/figma.ts`, replace `FigmaEffect` interface (line 30-36) :

```ts
export interface FigmaEffect {
  type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
  visible?: boolean;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  blendMode?: "NORMAL" | "MULTIPLY" | "SCREEN" | "OVERLAY" | "DARKEN" | "LIGHTEN";
}
```

Extend `FigmaTextStyle` interface (lines 45-51) :

```ts
export interface FigmaTextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT";
  textCase?: "ORIGINAL" | "UPPER" | "LOWER" | "TITLE";
  letterSpacing?: number;
  lineHeight?: number | "AUTO";
  textDecoration?: "NONE" | "UNDERLINE" | "STRIKETHROUGH";
}
```

Extend `FigmaPaint` interface (lines 20-28) :

```ts
export interface FigmaPaint {
  type: "SOLID" | "IMAGE" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL";
  color?: FigmaColor;
  scaleMode?: "FILL" | "FIT" | "CROP" | "TILE";
  imageRef?: string;
  visible?: boolean;
  opacity?: number;
  gradientStops?: FigmaGradientStop[];
  gradientHandlePositions?: [FigmaGradientHandle, FigmaGradientHandle, FigmaGradientHandle];
  blendMode?: "NORMAL" | "MULTIPLY" | "SCREEN" | "OVERLAY" | "DARKEN" | "LIGHTEN";
}
```

Extend `FigmaNode` interface (lines 58-74), add new optional fields :

```ts
export interface FigmaNode {
  id: string;
  name: string;
  type: "FRAME" | "GROUP" | "TEXT" | "RECTANGLE" | "VECTOR" | "INSTANCE";
  absoluteBoundingBox: FigmaBoundingBox;
  fills?: FigmaPaint[];
  strokes?: FigmaStroke[];
  strokeWeight?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  effects?: FigmaEffect[];
  clipsContent?: boolean;
  characters?: string;
  style?: FigmaTextStyle;
  svgOuterHtml?: string;
  children?: FigmaNode[];
  // AutoLayoutMixin v1.3.0
  layoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE";
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  layoutSizingHorizontal?: "FIXED" | "HUG" | "FILL";
  layoutSizingVertical?: "FIXED" | "HUG" | "FILL";
}
```

- [ ] **Step 2.4: Run test to verify pass**

Run: `bun test test/probe-figmanode-v1.3.0-schema.ts`
Expected: PASS, 2 tests.

- [ ] **Step 2.5: Run typecheck**

Run: `bun typecheck`
Expected: exit 0.

- [ ] **Step 2.6: Run smokes regression**

Run: `bun smoke:script:full && bun smoke:figma`
Expected: PASS (additive schema).

- [ ] **Step 2.7: Commit**

```bash
git add src/extractors/figma.ts test/probe-figmanode-v1.3.0-schema.ts
git commit -m "feat(schema): extend FigmaNode v1.3.0 with AutoLayoutMixin + Effects depth

FigmaEffect adds BACKGROUND_BLUR / spread / blendMode.
FigmaTextStyle adds letterSpacing / lineHeight / textDecoration.
FigmaPaint adds opacity / blendMode / CROP|TILE scaleMode.
FigmaNode adds layoutMode/primaryAxis/counterAxis/itemSpacing/padding/sizing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Q2 Layout (Auto-Layout extract + emit)

### Task 3: Extract computed Auto-Layout per element

**Files:**
- Modify: `src/extractors/htmltoclaude.ts` (add layout walker in evaluate-page block)
- Create: `test/smoke-autolayout-flexbox.ts`

- [ ] **Step 3.1: Write failing smoke for flexbox extraction**

Create: `test/smoke-autolayout-flexbox.ts`

```ts
import { test, expect } from "bun:test";
import { extractClaudeBundle } from "../src/extractors/htmltoclaude";
import { chromium } from "patchright";

test("flex row container → layout.mode HORIZONTAL + primaryAxis from justify-content", async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(`
    <html><body>
      <div id="root" style="display:flex;flex-direction:row;justify-content:space-between;align-items:center;gap:16px;padding:8px 16px;width:300px">
        <span>A</span><span>B</span><span>C</span>
      </div>
    </body></html>
  `);
  const bundle = await extractClaudeBundle(page, { max_nodes: 50 });
  const root = bundle.tree.find((n) => n.role === "root" || n.id === "n0") ?? bundle.tree[0];
  const flexContainer = bundle.tree.find((n) => n.layout?.mode === "HORIZONTAL");
  expect(flexContainer).toBeDefined();
  expect(flexContainer?.layout?.primaryAxisAlign).toBe("SPACE_BETWEEN");
  expect(flexContainer?.layout?.counterAxisAlign).toBe("CENTER");
  expect(flexContainer?.layout?.itemSpacing).toBe(16);
  expect(flexContainer?.layout?.padding?.top).toBe(8);
  expect(flexContainer?.layout?.padding?.left).toBe(16);
  await browser.close();
});
```

- [ ] **Step 3.2: Run smoke to verify failure**

Run: `bun test test/smoke-autolayout-flexbox.ts`
Expected: FAIL — `layout` undefined on extracted nodes.

- [ ] **Step 3.3: Add layout extractor inside htmltoclaude.ts evaluate block**

In `src/extractors/htmltoclaude.ts`, find the main `page.evaluate(() => { ... })` block, add helper INSIDE the evaluate (so it runs in browser context). Locate the loop that walks DOM elements and constructs ClaudeNode entries. After computing `box` + `fill` + existing fields, add :

```js
// Layout extraction — Auto-Layout mapping per Q2 S70 spec
function extractLayout(el, cs) {
  const display = cs.display;
  if (display !== "flex" && display !== "grid" && display !== "inline-flex" && display !== "inline-grid") {
    return { mode: "NONE" };
  }
  const isGrid = display === "grid" || display === "inline-grid";
  const flexDir = cs.flexDirection || "row";
  let mode = "HORIZONTAL";
  if (isGrid) {
    // Grid → outer = column flow (VERTICAL stacking rows). Nested auto-layout post-emit.
    mode = "VERTICAL";
  } else {
    mode = (flexDir === "column" || flexDir === "column-reverse") ? "VERTICAL" : "HORIZONTAL";
  }
  const jc = cs.justifyContent;
  const ai = cs.alignItems;
  function mapJC(v) {
    if (v === "flex-start" || v === "start") return "MIN";
    if (v === "center") return "CENTER";
    if (v === "flex-end" || v === "end") return "MAX";
    if (v === "space-between") return "SPACE_BETWEEN";
    return "MIN";
  }
  function mapAI(v) {
    if (v === "flex-start" || v === "start") return "MIN";
    if (v === "center") return "CENTER";
    if (v === "flex-end" || v === "end") return "MAX";
    if (v === "baseline") return "BASELINE";
    if (v === "stretch") return "MIN"; // Figma counter-axis FILL via layoutSizing; approx MIN here
    return "MIN";
  }
  const itemSpacing = parseFloat(cs.gap) || parseFloat(cs.columnGap) || parseFloat(cs.rowGap) || 0;
  const padding = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  function mapSizing(w) {
    if (w === "auto") return "HUG";
    if (w === "100%" || w.endsWith("%")) return "FILL";
    return "FIXED";
  }
  return {
    mode,
    primaryAxisAlign: mapJC(jc),
    counterAxisAlign: mapAI(ai),
    itemSpacing,
    padding,
    sizingH: mapSizing(el.style.width || cs.width || "auto"),
    sizingV: mapSizing(el.style.height || cs.height || "auto"),
  };
}
```

Then in the per-element ClaudeNode builder, attach :

```js
const layoutInfo = extractLayout(el, cs);
if (layoutInfo.mode !== "NONE") {
  node.layout = layoutInfo;
}
```

- [ ] **Step 3.4: Run smoke to verify pass**

Run: `bun test test/smoke-autolayout-flexbox.ts`
Expected: PASS — flexContainer detected with HORIZONTAL/SPACE_BETWEEN/CENTER/16/8/16.

- [ ] **Step 3.5: Run regression smokes**

Run: `bun smoke && bun smoke:claude && bun smoke:figma && bun smoke:script:full`
Expected: 4/4 PASS (additive layout field optional).

- [ ] **Step 3.6: Commit**

```bash
git add src/extractors/htmltoclaude.ts test/smoke-autolayout-flexbox.ts
git commit -m "feat(extract): Q2 Auto-Layout from getComputedStyle display:flex/grid

Walk computed display/flex-direction/justify-content/align-items/gap/padding.
Map CSS values → Figma AutoLayoutMixin (HORIZONTAL/VERTICAL + primaryAxis MIN/CENTER/MAX/SPACE_BETWEEN + counterAxis MIN/CENTER/MAX/BASELINE).
Grid display → outer VERTICAL (nested columns deferred S72+ if needed).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 4: Add CSS Grid smoke + extractor refinement

**Files:**
- Create: `test/smoke-autolayout-grid.ts`
- Modify: `src/extractors/htmltoclaude.ts` (grid template parsing)

- [ ] **Step 4.1: Write failing smoke for grid**

Create: `test/smoke-autolayout-grid.ts`

```ts
import { test, expect } from "bun:test";
import { extractClaudeBundle } from "../src/extractors/htmltoclaude";
import { chromium } from "patchright";

test("CSS grid 3-col container → layout.mode VERTICAL (rows outer)", async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(`
    <html><body>
      <div id="grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding:24px;width:600px">
        <span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span>
      </div>
    </body></html>
  `);
  const bundle = await extractClaudeBundle(page, { max_nodes: 50 });
  const gridContainer = bundle.tree.find((n) => n.layout?.mode === "VERTICAL");
  expect(gridContainer).toBeDefined();
  expect(gridContainer?.layout?.itemSpacing).toBe(12);
  expect(gridContainer?.layout?.padding?.top).toBe(24);
  await browser.close();
});
```

- [ ] **Step 4.2: Run smoke to verify pass (extractor already handles grid in Step 3)**

Run: `bun test test/smoke-autolayout-grid.ts`
Expected: PASS — grid → mode VERTICAL from Step 3.3 mapping.

- [ ] **Step 4.3: Commit**

```bash
git add test/smoke-autolayout-grid.ts
git commit -m "test(extract): smoke grid display → VERTICAL outer auto-layout

Verifies grid + gap + padding extraction. Nested columns auto-layout deferred.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 5: Map ClaudeNode.layout → FigmaNode.AutoLayoutMixin in figma.ts

**Files:**
- Modify: `src/extractors/figma.ts:259-337` (convertNode function)

- [ ] **Step 5.1: Write failing test for figma.ts mapping**

Create: `test/probe-figma-layout-mapping.ts`

```ts
import { test, expect } from "bun:test";
import { bundleToFigma } from "../src/extractors/figma";
import type { ClaudeBundle } from "../src/extractors/htmltoclaude";

test("ClaudeNode.layout → FigmaNode AutoLayoutMixin propagated", () => {
  const bundle: ClaudeBundle = {
    schema: "cbm/htmltoclaude/v1",
    url: "test://flex",
    captured_at: new Date().toISOString(),
    viewport: { w: 1440, h: 900 },
    tokens: { colors: {}, fonts: {} },
    tree: [{
      id: "n0",
      type: "FRAME",
      box: [0, 0, 300, 80],
      layout: {
        mode: "HORIZONTAL",
        primaryAxisAlign: "SPACE_BETWEEN",
        counterAxisAlign: "CENTER",
        itemSpacing: 16,
        padding: { top: 8, right: 16, bottom: 8, left: 16 },
        sizingH: "FIXED",
        sizingV: "HUG",
      },
      children: [],
    }],
    warnings: [],
    text_dump: [],
  } as any;

  const doc = bundleToFigma(bundle);
  const root = doc.document.children[0].children[0];
  expect(root.layoutMode).toBe("HORIZONTAL");
  expect(root.primaryAxisAlignItems).toBe("SPACE_BETWEEN");
  expect(root.counterAxisAlignItems).toBe("CENTER");
  expect(root.itemSpacing).toBe(16);
  expect(root.paddingTop).toBe(8);
  expect(root.paddingLeft).toBe(16);
  expect(root.layoutSizingHorizontal).toBe("FIXED");
  expect(root.layoutSizingVertical).toBe("HUG");
});
```

- [ ] **Step 5.2: Run test to verify failure**

Run: `bun test test/probe-figma-layout-mapping.ts`
Expected: FAIL — layoutMode undefined on output FigmaNode.

- [ ] **Step 5.3: Extend convertNode in figma.ts**

In `src/extractors/figma.ts:259-337` `convertNode()`, after `out.clipsContent` block and before TEXT block, insert layout mapping :

```ts
// Q2 v1.3.0 — Auto-Layout mapping from ClaudeNode.layout
if (n.layout && n.layout.mode !== "NONE") {
  out.layoutMode = n.layout.mode;
  if (n.layout.primaryAxisAlign) out.primaryAxisAlignItems = n.layout.primaryAxisAlign;
  if (n.layout.counterAxisAlign) out.counterAxisAlignItems = n.layout.counterAxisAlign;
  if (n.layout.itemSpacing !== undefined) out.itemSpacing = n.layout.itemSpacing;
  if (n.layout.padding) {
    out.paddingTop = n.layout.padding.top;
    out.paddingRight = n.layout.padding.right;
    out.paddingBottom = n.layout.padding.bottom;
    out.paddingLeft = n.layout.padding.left;
  }
  if (n.layout.sizingH) out.layoutSizingHorizontal = n.layout.sizingH;
  if (n.layout.sizingV) out.layoutSizingVertical = n.layout.sizingV;
}
```

- [ ] **Step 5.4: Run test to verify pass**

Run: `bun test test/probe-figma-layout-mapping.ts`
Expected: PASS.

- [ ] **Step 5.5: Run regression**

Run: `bun smoke:figma && bun smoke:script:full`
Expected: PASS.

- [ ] **Step 5.6: Commit**

```bash
git add src/extractors/figma.ts test/probe-figma-layout-mapping.ts
git commit -m "feat(figma.ts): map ClaudeNode.layout → FigmaNode AutoLayoutMixin

convertNode emits layoutMode/primaryAxisAlignItems/counterAxisAlignItems/
itemSpacing/paddingTop|Right|Bottom|Left/layoutSizingHorizontal|Vertical.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 6: Emit AutoLayoutMixin Plugin API code in figma_emit.ts

**Files:**
- Modify: `src/lib/figma_emit.ts:144-255` (emitNodeFlat)

- [ ] **Step 6.1: Write failing test for emit Plugin API code**

Create: `test/probe-emit-autolayout.ts`

```ts
import { test, expect } from "bun:test";
import { emitFigmaPluginCode } from "../src/lib/figma_emit";
import type { FigmaDocument } from "../src/extractors/figma";

test("FigmaNode with layoutMode emits Plugin API autolayout assignments", () => {
  const doc: FigmaDocument = {
    schema: "cbm/htmltofigma/v0",
    source_url: "test://emit",
    captured_at: new Date().toISOString(),
    viewport: { width: 1440, height: 900 },
    document: {
      id: "0:0", name: "Document", type: "DOCUMENT",
      children: [{
        id: "0:1", name: "test", type: "CANVAS",
        backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
        children: [{
          id: "n0", name: "container", type: "FRAME",
          absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 80 },
          layoutMode: "HORIZONTAL",
          primaryAxisAlignItems: "SPACE_BETWEEN",
          counterAxisAlignItems: "CENTER",
          itemSpacing: 16,
          paddingTop: 8, paddingRight: 16, paddingBottom: 8, paddingLeft: 16,
          layoutSizingHorizontal: "FIXED",
          layoutSizingVertical: "HUG",
        }],
      }],
    },
    warnings: [], text_dump: [],
    metrics: { nodes: 1, approx_tokens: 0, duration_ms: 0 },
  };
  const result = emitFigmaPluginCode(doc);
  const code = result.chunks[0].code;
  expect(code).toContain('.layoutMode = "HORIZONTAL"');
  expect(code).toContain('.primaryAxisAlignItems = "SPACE_BETWEEN"');
  expect(code).toContain('.counterAxisAlignItems = "CENTER"');
  expect(code).toContain('.itemSpacing = 16');
  expect(code).toContain('.paddingTop = 8');
  expect(code).toContain('.paddingLeft = 16');
  expect(code).toContain('.layoutSizingHorizontal = "FIXED"');
  expect(code).toContain('.layoutSizingVertical = "HUG"');
});
```

- [ ] **Step 6.2: Run test to verify failure**

Run: `bun test test/probe-emit-autolayout.ts`
Expected: FAIL — code does not contain `.layoutMode` assignments.

- [ ] **Step 6.3: Extend emitNodeFlat for AutoLayoutMixin emission**

In `src/lib/figma_emit.ts:144-255` `emitNodeFlat()`, after the `clipsContent` line emission block (around line 244-246), and before `out.push(...)`, insert :

```ts
// Q2 v1.3.0 — Emit AutoLayoutMixin Plugin API assignments
if (node.layoutMode !== undefined && (node.type === "FRAME" || node.type === "GROUP")) {
  lines.push(`${v}.layoutMode = ${safeJson(node.layoutMode)};`);
  if (node.primaryAxisAlignItems !== undefined) {
    lines.push(`${v}.primaryAxisAlignItems = ${safeJson(node.primaryAxisAlignItems)};`);
  }
  if (node.counterAxisAlignItems !== undefined) {
    lines.push(`${v}.counterAxisAlignItems = ${safeJson(node.counterAxisAlignItems)};`);
  }
  if (node.itemSpacing !== undefined) {
    lines.push(`${v}.itemSpacing = ${node.itemSpacing};`);
  }
  if (node.paddingTop !== undefined) lines.push(`${v}.paddingTop = ${node.paddingTop};`);
  if (node.paddingRight !== undefined) lines.push(`${v}.paddingRight = ${node.paddingRight};`);
  if (node.paddingBottom !== undefined) lines.push(`${v}.paddingBottom = ${node.paddingBottom};`);
  if (node.paddingLeft !== undefined) lines.push(`${v}.paddingLeft = ${node.paddingLeft};`);
  if (node.layoutSizingHorizontal !== undefined) {
    lines.push(`${v}.layoutSizingHorizontal = ${safeJson(node.layoutSizingHorizontal)};`);
  }
  if (node.layoutSizingVertical !== undefined) {
    lines.push(`${v}.layoutSizingVertical = ${safeJson(node.layoutSizingVertical)};`);
  }
}
```

- [ ] **Step 6.4: Run test to verify pass**

Run: `bun test test/probe-emit-autolayout.ts`
Expected: PASS — all 8 expect calls hit.

- [ ] **Step 6.5: Run regression smokes**

Run: `bun smoke:script && bun smoke:script:slim && bun smoke:script:full`
Expected: 3/3 PASS.

- [ ] **Step 6.6: Commit**

```bash
git add src/lib/figma_emit.ts test/probe-emit-autolayout.ts
git commit -m "feat(emit): Q2 Auto-Layout Plugin API code emission

emitNodeFlat emits layoutMode/primaryAxisAlignItems/counterAxisAlignItems/
itemSpacing/paddingX/layoutSizingX assignments after clipsContent.
Only emits for FRAME|GROUP nodes (AutoLayoutMixin scope).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — Q3a Text props depth (letter-spacing/line-height/decoration/text-shadow)

### Task 7: Extract text props in htmltoclaude.ts

**Files:**
- Modify: `src/extractors/htmltoclaude.ts` (extend per-element TEXT extraction)
- Create: `test/smoke-text-props.ts`

- [ ] **Step 7.1: Write failing smoke**

Create: `test/smoke-text-props.ts`

```ts
import { test, expect } from "bun:test";
import { extractClaudeBundle } from "../src/extractors/htmltoclaude";
import { chromium } from "patchright";

test("text props : letter-spacing + line-height + text-decoration + text-transform", async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(`
    <html><body>
      <p style="letter-spacing:2px;line-height:24px;text-decoration:underline;text-transform:uppercase">Hello</p>
    </body></html>
  `);
  const bundle = await extractClaudeBundle(page, { max_nodes: 20 });
  const textNode = bundle.tree.find((n) => n.type === "TEXT" || n.chars);
  expect(textNode).toBeDefined();
  expect(textNode?.text_props?.letterSpacing).toBe(2);
  expect(textNode?.text_props?.lineHeight).toBe(24);
  expect(textNode?.text_props?.textDecoration).toBe("UNDERLINE");
  expect(textNode?.text_props?.textCase).toBe("UPPER");
  expect(textNode?.chars?.toUpperCase()).toBe(textNode?.chars);  // text already uppercased at extract
  await browser.close();
});
```

- [ ] **Step 7.2: Run smoke to verify fail**

Run: `bun test test/smoke-text-props.ts`
Expected: FAIL — `text_props` undefined.

- [ ] **Step 7.3: Add text props extractor inside htmltoclaude.ts**

In `src/extractors/htmltoclaude.ts`, find per-element TEXT-node construction. Add inside browser-context evaluate block, near where `chars` and `font` are extracted :

```js
// Q3a v1.3.0 — Text props depth extraction
function extractTextProps(el, cs) {
  const ls = parseFloat(cs.letterSpacing);
  const lh = cs.lineHeight === "normal" ? "AUTO" : parseFloat(cs.lineHeight);
  const td = cs.textDecorationLine || cs.textDecoration || "none";
  let textDecoration = "NONE";
  if (td.includes("underline")) textDecoration = "UNDERLINE";
  else if (td.includes("line-through")) textDecoration = "STRIKETHROUGH";
  const tt = cs.textTransform || "none";
  let textCase = "ORIGINAL";
  if (tt === "uppercase") textCase = "UPPER";
  else if (tt === "lowercase") textCase = "LOWER";
  else if (tt === "capitalize") textCase = "TITLE";

  const textShadowRaw = cs.textShadow || "none";
  const textShadows = parseShadowList(textShadowRaw, false); // inset always false for text-shadow

  return {
    ...(Number.isFinite(ls) && ls !== 0 ? { letterSpacing: ls } : {}),
    ...(lh === "AUTO" || Number.isFinite(lh) ? { lineHeight: lh } : {}),
    textDecoration,
    textCase,
    ...(textShadows.length > 0 ? { textShadows } : {}),
  };
}

// Helper : parse CSS box-shadow / text-shadow stack (Q3b reused here for text-shadow)
function parseShadowList(raw, supportsInset) {
  if (!raw || raw === "none") return [];
  // Split CSV honoring rgba(...) commas
  const parts = [];
  let depth = 0, cur = "";
  for (const ch of raw) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());

  const out = [];
  for (const p of parts) {
    const inset = supportsInset && /\binset\b/.test(p);
    const colorMatch = p.match(/(rgba?\([^)]+\)|#[0-9a-f]{3,8}|\b[a-z]+\b)/i);
    const colorRaw = colorMatch ? colorMatch[1] : "rgb(0,0,0)";
    const numMatches = p.replace(colorRaw, "").match(/-?[\d.]+px/g) || [];
    const [ox, oy, bl, sp] = numMatches.map((s) => parseFloat(s));
    const color = parseColorRgba(colorRaw);
    out.push({
      type: inset ? "INNER_SHADOW" : "DROP_SHADOW",
      visible: true,
      color,
      offset: { x: ox || 0, y: oy || 0 },
      radius: bl || 0,
      spread: sp || 0,
      blendMode: "NORMAL",
    });
  }
  return out;
}

function parseColorRgba(raw) {
  if (raw.startsWith("rgb")) {
    const m = raw.match(/rgba?\(([^)]+)\)/);
    if (!m) return { r: 0, g: 0, b: 0, a: 1 };
    const [r, g, b, a] = m[1].split(",").map((s) => parseFloat(s.trim()));
    return { r: r/255, g: g/255, b: b/255, a: a === undefined ? 1 : a };
  }
  // hex fallback (basic)
  return { r: 0, g: 0, b: 0, a: 1 };
}
```

Then in TEXT-node builder (where `chars`/`font` are assigned), add :

```js
if (node.type === "TEXT" || /* element is text-bearing */ true) {
  const tp = extractTextProps(el, cs);
  if (tp) node.text_props = tp;
  // Apply text-transform at extract since Figma has limited textCase semantics
  if (tp?.textCase === "UPPER" && node.chars) node.chars = node.chars.toUpperCase();
  else if (tp?.textCase === "LOWER" && node.chars) node.chars = node.chars.toLowerCase();
  else if (tp?.textCase === "TITLE" && node.chars) {
    node.chars = node.chars.replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
```

- [ ] **Step 7.4: Run smoke verify pass**

Run: `bun test test/smoke-text-props.ts`
Expected: PASS — all 5 assertions.

- [ ] **Step 7.5: Regression smokes**

Run: `bun smoke:claude && bun smoke:figma && bun smoke:script:full`
Expected: PASS.

- [ ] **Step 7.6: Commit**

```bash
git add src/extractors/htmltoclaude.ts test/smoke-text-props.ts
git commit -m "feat(extract): Q3a text props depth — letter-spacing/line-height/decoration/case/shadow

Extract getComputedStyle().letterSpacing/lineHeight/textDecoration/textTransform/textShadow.
text-transform applied at extract (chars.toUpperCase()) since Figma textCase semantics weaker.
text-shadow CSV parsed via shared parseShadowList helper (reused Q3b).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 8: Map text_props → FigmaTextStyle in figma.ts

**Files:**
- Modify: `src/extractors/figma.ts:308-322` (TEXT block in convertNode)

- [ ] **Step 8.1: Write failing test**

Create: `test/probe-figma-text-props-mapping.ts`

```ts
import { test, expect } from "bun:test";
import { bundleToFigma } from "../src/extractors/figma";

test("ClaudeNode.text_props → FigmaTextStyle propagated", () => {
  const bundle: any = {
    schema: "cbm/htmltoclaude/v1",
    url: "test://text",
    captured_at: new Date().toISOString(),
    viewport: { w: 1440, h: 900 },
    tokens: { colors: {}, fonts: {} },
    tree: [{
      id: "n0", type: "TEXT", box: [0, 0, 100, 24], chars: "HELLO",
      text_props: {
        letterSpacing: 2,
        lineHeight: 24,
        textDecoration: "UNDERLINE",
        textCase: "UPPER",
      },
    }],
    warnings: [], text_dump: [],
  };
  const doc = bundleToFigma(bundle);
  const node = doc.document.children[0].children[0];
  expect(node.style?.letterSpacing).toBe(2);
  expect(node.style?.lineHeight).toBe(24);
  expect(node.style?.textDecoration).toBe("UNDERLINE");
  expect(node.style?.textCase).toBe("UPPER");
});
```

- [ ] **Step 8.2: Run test verify fail**

Run: `bun test test/probe-figma-text-props-mapping.ts`
Expected: FAIL.

- [ ] **Step 8.3: Extend TEXT block in convertNode**

In `src/extractors/figma.ts:308-322` TEXT block, inside the `if (out.type === "TEXT" && n.chars) { ... }` block, after the existing `if (weight && Number.isFinite(weight)) style.fontWeight = weight;` line, add :

```ts
// Q3a v1.3.0 — text props depth
if (n.text_props) {
  if (n.text_props.letterSpacing !== undefined) style.letterSpacing = n.text_props.letterSpacing;
  if (n.text_props.lineHeight !== undefined) style.lineHeight = n.text_props.lineHeight;
  if (n.text_props.textDecoration) style.textDecoration = n.text_props.textDecoration;
  if (n.text_props.textCase) style.textCase = n.text_props.textCase;
}
// text-shadow → emit as effects on TEXT node
if (n.text_props?.textShadows && n.text_props.textShadows.length > 0) {
  out.effects = (out.effects ?? []).concat(n.text_props.textShadows as any);
}
```

- [ ] **Step 8.4: Run test verify pass**

Run: `bun test test/probe-figma-text-props-mapping.ts`
Expected: PASS.

- [ ] **Step 8.5: Regression**

Run: `bun smoke:figma && bun smoke:script:full`
Expected: PASS.

- [ ] **Step 8.6: Commit**

```bash
git add src/extractors/figma.ts test/probe-figma-text-props-mapping.ts
git commit -m "feat(figma.ts): map text_props → FigmaTextStyle + text-shadow → effects

convertNode TEXT branch propagates letterSpacing/lineHeight/textDecoration/textCase.
text_props.textShadows → out.effects[] (DropShadow on TextNode).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 9: Emit text props Plugin API code

**Files:**
- Modify: `src/lib/figma_emit.ts` TEXT branch (lines ~169-184)

- [ ] **Step 9.1: Write failing test**

Create: `test/probe-emit-text-props.ts`

```ts
import { test, expect } from "bun:test";
import { emitFigmaPluginCode } from "../src/lib/figma_emit";

test("TEXT FigmaNode emits letterSpacing/lineHeight/textDecoration/textCase code", () => {
  const doc: any = {
    schema: "cbm/htmltofigma/v0",
    source_url: "test://emit-text",
    captured_at: new Date().toISOString(),
    viewport: { width: 1440, height: 900 },
    document: {
      id: "0:0", name: "Document", type: "DOCUMENT",
      children: [{
        id: "0:1", name: "test", type: "CANVAS",
        backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
        children: [{
          id: "n0", name: "txt", type: "TEXT",
          absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 24 },
          characters: "HELLO",
          style: {
            fontFamily: "Inter",
            fontSize: 16,
            fontWeight: 400,
            letterSpacing: 2,
            lineHeight: 24,
            textDecoration: "UNDERLINE",
            textCase: "UPPER",
          },
        }],
      }],
    },
    warnings: [], text_dump: [],
    metrics: { nodes: 1, approx_tokens: 0, duration_ms: 0 },
  };
  const r = emitFigmaPluginCode(doc);
  const c = r.chunks[0].code;
  expect(c).toContain('.letterSpacing = { unit: "PIXELS", value: 2 }');
  expect(c).toContain('.lineHeight = { unit: "PIXELS", value: 24 }');
  expect(c).toContain('.textDecoration = "UNDERLINE"');
  expect(c).toContain('.textCase = "UPPER"');
});
```

- [ ] **Step 9.2: Run test verify fail**

Run: `bun test test/probe-emit-text-props.ts`
Expected: FAIL.

- [ ] **Step 9.3: Extend TEXT branch in emitNodeFlat**

In `src/lib/figma_emit.ts:169-184` TEXT case branch, after the existing `if (node.style?.fontSize !== undefined) { lines.push(...) }` line and before `ops++; break;`, insert :

```ts
// Q3a v1.3.0 — text props depth Plugin API emit
if (node.style?.letterSpacing !== undefined) {
  lines.push(`${v}.letterSpacing = { unit: "PIXELS", value: ${node.style.letterSpacing} };`);
}
if (node.style?.lineHeight !== undefined) {
  if (node.style.lineHeight === "AUTO") {
    lines.push(`${v}.lineHeight = { unit: "AUTO" };`);
  } else {
    lines.push(`${v}.lineHeight = { unit: "PIXELS", value: ${node.style.lineHeight} };`);
  }
}
if (node.style?.textDecoration && node.style.textDecoration !== "NONE") {
  lines.push(`${v}.textDecoration = ${safeJson(node.style.textDecoration)};`);
}
if (node.style?.textCase && node.style.textCase !== "ORIGINAL") {
  lines.push(`${v}.textCase = ${safeJson(node.style.textCase)};`);
}
```

- [ ] **Step 9.4: Run test verify pass**

Run: `bun test test/probe-emit-text-props.ts`
Expected: PASS.

- [ ] **Step 9.5: Regression**

Run: `bun smoke:script:full`
Expected: PASS.

- [ ] **Step 9.6: Commit**

```bash
git add src/lib/figma_emit.ts test/probe-emit-text-props.ts
git commit -m "feat(emit): Q3a text props Plugin API code (letterSpacing/lineHeight/textDecoration/textCase)

Plugin API takes letterSpacing/lineHeight as { unit:'PIXELS'|'AUTO', value }.
textDecoration UNDERLINE|STRIKETHROUGH. textCase UPPER|LOWER|TITLE|ORIGINAL.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — Q3b Effects (box-shadow + filter:blur + backdrop-filter:blur)

### Task 10: Extract effects (shadows + blurs) per element

**Files:**
- Modify: `src/extractors/htmltoclaude.ts` (per-element evaluate block)
- Create: `test/smoke-effects.ts`

- [ ] **Step 10.1: Write failing smoke**

Create: `test/smoke-effects.ts`

```ts
import { test, expect } from "bun:test";
import { extractClaudeBundle } from "../src/extractors/htmltoclaude";
import { chromium } from "patchright";

test("box-shadow + filter:blur + backdrop-filter:blur → effects[]", async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(`
    <html><body>
      <div id="card" style="
        width:200px;height:100px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.5);
        filter: blur(4px);
        backdrop-filter: blur(8px);
      ">Card</div>
    </body></html>
  `);
  const bundle = await extractClaudeBundle(page, { max_nodes: 20 });
  const card = bundle.tree.find((n) => Array.isArray(n.effects) && n.effects.length >= 3);
  expect(card).toBeDefined();
  const types = card!.effects!.map((e) => e.type);
  expect(types).toContain("DROP_SHADOW");
  expect(types).toContain("INNER_SHADOW");
  expect(types).toContain("LAYER_BLUR");
  expect(types).toContain("BACKGROUND_BLUR");
  await browser.close();
});
```

- [ ] **Step 10.2: Run smoke verify fail**

Run: `bun test test/smoke-effects.ts`
Expected: FAIL.

- [ ] **Step 10.3: Add effects extractor inside htmltoclaude.ts evaluate block**

In `src/extractors/htmltoclaude.ts` evaluate block (browser context), after the `extractLayout` helper added in Task 3.3, add :

```js
// Q3b v1.3.0 — Effects extraction (shadows + blurs)
function extractEffects(el, cs) {
  const effects = [];
  // box-shadow (multi-shadow CSV) → DROP_SHADOW + INNER_SHADOW (inset)
  const bs = cs.boxShadow || "none";
  if (bs !== "none") {
    effects.push(...parseShadowList(bs, true)); // supportsInset=true
  }
  // filter: blur(Npx) → LAYER_BLUR
  const filter = cs.filter || "none";
  const blurMatch = filter.match(/blur\(([\d.]+)px\)/);
  if (blurMatch) {
    effects.push({ type: "LAYER_BLUR", visible: true, radius: parseFloat(blurMatch[1]) });
  }
  // backdrop-filter: blur(Npx) → BACKGROUND_BLUR
  const bf = cs.backdropFilter || cs.webkitBackdropFilter || "none";
  const bfBlur = bf.match(/blur\(([\d.]+)px\)/);
  if (bfBlur) {
    effects.push({ type: "BACKGROUND_BLUR", visible: true, radius: parseFloat(bfBlur[1]) });
  }
  return effects;
}
```

Then in per-element ClaudeNode builder, after layout assignment :

```js
const eff = extractEffects(el, cs);
if (eff.length > 0) node.effects = eff;
```

- [ ] **Step 10.4: Run smoke verify pass**

Run: `bun test test/smoke-effects.ts`
Expected: PASS.

- [ ] **Step 10.5: Regression**

Run: `bun smoke:claude && bun smoke:script:full`
Expected: PASS.

- [ ] **Step 10.6: Commit**

```bash
git add src/extractors/htmltoclaude.ts test/smoke-effects.ts
git commit -m "feat(extract): Q3b effects — box-shadow / filter:blur / backdrop-filter:blur

Walk computed boxShadow (multi CSV w/ inset), filter:blur(Npx), backdropFilter.
Emit ClaudeEffect[] with DROP_SHADOW / INNER_SHADOW / LAYER_BLUR / BACKGROUND_BLUR.
parseShadowList shared helper from Q3a (text-shadow).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 11: Map ClaudeNode.effects → FigmaNode.effects in figma.ts

**Files:**
- Modify: `src/extractors/figma.ts:259-337` (convertNode)

- [ ] **Step 11.1: Write failing test**

Create: `test/probe-figma-effects-mapping.ts`

```ts
import { test, expect } from "bun:test";
import { bundleToFigma } from "../src/extractors/figma";

test("ClaudeNode.effects → FigmaNode.effects propagated", () => {
  const bundle: any = {
    schema: "cbm/htmltoclaude/v1",
    url: "test://eff", captured_at: new Date().toISOString(),
    viewport: { w: 1440, h: 900 }, tokens: { colors: {}, fonts: {} },
    tree: [{
      id: "n0", type: "FRAME", box: [0, 0, 200, 100],
      effects: [
        { type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 4 }, radius: 8, spread: 0, blendMode: "NORMAL" },
        { type: "LAYER_BLUR", radius: 4 },
      ],
    }],
    warnings: [], text_dump: [],
  };
  const doc = bundleToFigma(bundle);
  const node = doc.document.children[0].children[0];
  expect(node.effects?.length).toBe(2);
  expect(node.effects?.[0].type).toBe("DROP_SHADOW");
  expect(node.effects?.[1].type).toBe("LAYER_BLUR");
});
```

- [ ] **Step 11.2: Run test verify fail**

Run: `bun test test/probe-figma-effects-mapping.ts`
Expected: FAIL.

- [ ] **Step 11.3: Extend convertNode in figma.ts**

In `src/extractors/figma.ts:259-337` `convertNode()`, before `if (n.children?.length)` block (line ~332), add :

```ts
// Q3b v1.3.0 — Effects propagation (shadows + blurs)
if (n.effects && n.effects.length > 0) {
  out.effects = n.effects.map((e: any) => ({
    type: e.type,
    visible: e.visible !== false,
    color: e.color,
    offset: e.offset,
    radius: e.radius,
    spread: e.spread,
    blendMode: e.blendMode,
  }));
}
```

- [ ] **Step 11.4: Test verify pass**

Run: `bun test test/probe-figma-effects-mapping.ts`
Expected: PASS.

- [ ] **Step 11.5: Regression**

Run: `bun smoke:figma && bun smoke:script:full`
Expected: PASS.

- [ ] **Step 11.6: Commit**

```bash
git add src/extractors/figma.ts test/probe-figma-effects-mapping.ts
git commit -m "feat(figma.ts): map ClaudeNode.effects → FigmaNode.effects

convertNode propagates effects[] preserving type/color/offset/radius/spread/blendMode.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 12: Emit Effects Plugin API code

**Files:**
- Modify: `src/lib/figma_emit.ts` (insert after AutoLayoutMixin emit block)

- [ ] **Step 12.1: Write failing test**

Create: `test/probe-emit-effects.ts`

```ts
import { test, expect } from "bun:test";
import { emitFigmaPluginCode } from "../src/lib/figma_emit";

test("FigmaNode.effects → Plugin API .effects assignment", () => {
  const doc: any = {
    schema: "cbm/htmltofigma/v0",
    source_url: "test://eff", captured_at: new Date().toISOString(),
    viewport: { width: 1440, height: 900 },
    document: {
      id: "0:0", name: "Document", type: "DOCUMENT",
      children: [{
        id: "0:1", name: "test", type: "CANVAS",
        backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
        children: [{
          id: "n0", name: "card", type: "FRAME",
          absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 100 },
          effects: [
            { type: "DROP_SHADOW", visible: true, color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 4 }, radius: 8, spread: 0, blendMode: "NORMAL" },
            { type: "LAYER_BLUR", visible: true, radius: 4 },
          ],
        }],
      }],
    },
    warnings: [], text_dump: [],
    metrics: { nodes: 1, approx_tokens: 0, duration_ms: 0 },
  };
  const r = emitFigmaPluginCode(doc);
  const c = r.chunks[0].code;
  expect(c).toContain('.effects =');
  expect(c).toContain('"type":"DROP_SHADOW"');
  expect(c).toContain('"type":"LAYER_BLUR"');
});
```

- [ ] **Step 12.2: Test verify fail**

Run: `bun test test/probe-emit-effects.ts`
Expected: FAIL.

- [ ] **Step 12.3: Add effects emit in emitNodeFlat**

In `src/lib/figma_emit.ts:144-255` `emitNodeFlat()`, after the AutoLayoutMixin emit block added in Task 6.3, insert :

```ts
// Q3b v1.3.0 — Effects emit
if (node.effects && node.effects.length > 0) {
  const sanitized = node.effects.map((e) => {
    const obj: any = { type: e.type, visible: e.visible !== false };
    if (e.color) obj.color = { r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a ?? 1 };
    if (e.offset) obj.offset = e.offset;
    if (e.radius !== undefined) obj.radius = e.radius;
    if (e.spread !== undefined) obj.spread = e.spread;
    if (e.blendMode) obj.blendMode = e.blendMode;
    return obj;
  });
  lines.push(`${v}.effects = ${safeJson(sanitized)};`);
}
```

- [ ] **Step 12.4: Test verify pass**

Run: `bun test test/probe-emit-effects.ts`
Expected: PASS.

- [ ] **Step 12.5: Regression smokes**

Run: `bun smoke:script && bun smoke:script:full`
Expected: PASS.

- [ ] **Step 12.6: Commit**

```bash
git add src/lib/figma_emit.ts test/probe-emit-effects.ts
git commit -m "feat(emit): Q3b Effects Plugin API code (.effects = [DropShadow|InnerShadow|LayerBlur|BackgroundBlur])

Sanitize color alpha default 1, preserve visible/offset/radius/spread/blendMode.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5 — Q3c Backgrounds multi-layer + blend-mode

### Task 13: Extract bg_fills multi-layer per element

**Files:**
- Modify: `src/extractors/htmltoclaude.ts`
- Create: `test/smoke-multi-bg.ts`

- [ ] **Step 13.1: Write failing smoke**

Create: `test/smoke-multi-bg.ts`

```ts
import { test, expect } from "bun:test";
import { extractClaudeBundle } from "../src/extractors/htmltoclaude";
import { chromium } from "patchright";

test("multi-layer bg: gradient + url() + solid + blend-mode → bg_fills[]", async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(`
    <html><body>
      <div id="bg" style="
        width:200px;height:200px;
        background-image: linear-gradient(180deg, rgba(255,0,0,0.5), rgba(0,0,255,0.5)), url('https://example.com/img.png');
        background-blend-mode: multiply, normal;
        background-size: cover, contain;
        background-color: rgb(0,255,0);
      ">Bg</div>
    </body></html>
  `);
  const bundle = await extractClaudeBundle(page, { max_nodes: 20 });
  const bg = bundle.tree.find((n) => Array.isArray(n.bg_fills) && n.bg_fills.length >= 2);
  expect(bg).toBeDefined();
  const types = bg!.bg_fills!.map((f) => f.type);
  expect(types).toContain("GRADIENT_LINEAR");
  expect(types).toContain("IMAGE");
  expect(bg!.bg_fills!.find((f) => f.type === "GRADIENT_LINEAR")?.blendMode).toBe("MULTIPLY");
  expect(bg!.bg_fills!.find((f) => f.type === "IMAGE")?.scaleMode).toBe("FIT");
  await browser.close();
});
```

- [ ] **Step 13.2: Test verify fail**

Run: `bun test test/smoke-multi-bg.ts`
Expected: FAIL.

- [ ] **Step 13.3: Add bg_fills extractor in htmltoclaude.ts evaluate block**

In `src/extractors/htmltoclaude.ts` evaluate block, add helper :

```js
// Q3c v1.3.0 — Backgrounds multi-layer extraction
function extractBgFills(el, cs) {
  const bgImage = cs.backgroundImage || "none";
  const bgColor = cs.backgroundColor || "rgba(0,0,0,0)";
  const bgBlend = cs.backgroundBlendMode || "normal";
  const bgSize = cs.backgroundSize || "auto";
  const bgPosition = cs.backgroundPosition || "0% 0%";

  if (bgImage === "none" && (bgColor === "rgba(0,0,0,0)" || bgColor === "transparent")) {
    return [];
  }

  const fills = [];

  // Split image CSV honoring parens (gradients have commas inside)
  const imageLayers = [];
  if (bgImage !== "none") {
    let depth = 0, cur = "";
    for (const ch of bgImage) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      if (ch === "," && depth === 0) { imageLayers.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    if (cur.trim()) imageLayers.push(cur.trim());
  }

  const blendModes = bgBlend.split(",").map((s) => s.trim().toUpperCase());
  const sizes = bgSize.split(",").map((s) => s.trim());
  const positions = bgPosition.split(",").map((s) => s.trim());

  function mapBlend(v) {
    const m = (v || "NORMAL").toUpperCase();
    if (["NORMAL", "MULTIPLY", "SCREEN", "OVERLAY", "DARKEN", "LIGHTEN"].includes(m)) return m;
    return "NORMAL";
  }
  function mapScale(s) {
    if (!s) return "FILL";
    if (s.includes("cover")) return "FILL";
    if (s.includes("contain")) return "FIT";
    return "FILL";
  }

  for (let i = 0; i < imageLayers.length; i++) {
    const layer = imageLayers[i];
    const blend = blendModes[i] || blendModes[0] || "NORMAL";
    const size = sizes[i] || sizes[0] || "auto";
    const pos = positions[i] || positions[0] || "0% 0%";
    if (layer.startsWith("linear-gradient") || layer.startsWith("radial-gradient")) {
      fills.push({
        type: layer.startsWith("linear-gradient") ? "GRADIENT_LINEAR" : "GRADIENT_RADIAL",
        raw: layer,
        blendMode: mapBlend(blend),
      });
    } else {
      const urlMatch = layer.match(/url\(\s*["']?([^"')]+)["']?\s*\)/);
      if (urlMatch) {
        fills.push({
          type: "IMAGE",
          raw: layer,
          src: urlMatch[1],
          blendMode: mapBlend(blend),
          scaleMode: mapScale(size),
          position: pos,
        });
      }
    }
  }
  // Solid background-color = last in stack (CSS painting order : color paints first, image on top → reverse for Figma which paints fills[0] first)
  if (bgColor && bgColor !== "rgba(0,0,0,0)" && bgColor !== "transparent") {
    fills.push({ type: "SOLID", raw: bgColor, color: bgColor, blendMode: "NORMAL" });
  }
  // CSS first declared = top layer ; Figma fills[N-1] = topmost ; so reverse to align z-order
  return fills.reverse();
}
```

Then in per-element builder :

```js
const bg = extractBgFills(el, cs);
if (bg.length > 0) node.bg_fills = bg;
```

- [ ] **Step 13.4: Test verify pass**

Run: `bun test test/smoke-multi-bg.ts`
Expected: PASS.

- [ ] **Step 13.5: Regression**

Run: `bun smoke:claude && bun smoke:script:full`
Expected: PASS.

- [ ] **Step 13.6: Commit**

```bash
git add src/extractors/htmltoclaude.ts test/smoke-multi-bg.ts
git commit -m "feat(extract): Q3c multi-layer backgrounds + blend-mode + scale-mode

Parse CSV background-image (gradients + url() layers) honoring paren depth.
Per-layer background-blend-mode → BlendMode. background-size cover|contain → FILL|FIT.
Solid bg-color appended last, reverse stack for Figma fills[] z-order.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 14: Map ClaudeNode.bg_fills → FigmaNode.fills with multi-layer

**Files:**
- Modify: `src/extractors/figma.ts:272-287` (fills construction in convertNode)

- [ ] **Step 14.1: Write failing test**

Create: `test/probe-figma-bg-mapping.ts`

```ts
import { test, expect } from "bun:test";
import { bundleToFigma } from "../src/extractors/figma";

test("ClaudeNode.bg_fills (multi-layer + blend) → FigmaNode.fills", () => {
  const bundle: any = {
    schema: "cbm/htmltoclaude/v1",
    url: "test://bg", captured_at: new Date().toISOString(),
    viewport: { w: 1440, h: 900 }, tokens: { colors: {}, fonts: {} },
    tree: [{
      id: "n0", type: "FRAME", box: [0, 0, 200, 200],
      bg_fills: [
        { type: "GRADIENT_LINEAR", raw: "linear-gradient(180deg, rgba(255,0,0,0.5), rgba(0,0,255,0.5))", blendMode: "MULTIPLY" },
        { type: "IMAGE", raw: "url(...)", src: "https://example.com/img.png", scaleMode: "FIT", blendMode: "NORMAL" },
        { type: "SOLID", raw: "rgb(0,255,0)", color: "rgb(0, 255, 0)", blendMode: "NORMAL" },
      ],
    }],
    warnings: [], text_dump: [],
  };
  const doc = bundleToFigma(bundle);
  const node = doc.document.children[0].children[0];
  expect(node.fills?.length).toBe(3);
  expect(node.fills?.[0].type).toBe("GRADIENT_LINEAR");
  expect(node.fills?.[0].blendMode).toBe("MULTIPLY");
  expect(node.fills?.[1].type).toBe("IMAGE");
  expect(node.fills?.[1].scaleMode).toBe("FIT");
  expect(node.fills?.[2].type).toBe("SOLID");
});
```

- [ ] **Step 14.2: Test verify fail**

Run: `bun test test/probe-figma-bg-mapping.ts`
Expected: FAIL.

- [ ] **Step 14.3: Extend fills construction in convertNode**

In `src/extractors/figma.ts:272-287`, after the existing fills construction block, replace/extend to honor `n.bg_fills` :

```ts
// Q3c v1.3.0 — bg_fills multi-layer takes precedence over single-fill legacy when present
if (n.bg_fills && n.bg_fills.length > 0) {
  const multiFills: FigmaPaint[] = [];
  for (const f of n.bg_fills) {
    if (f.type === "SOLID") {
      const col = parseColor(f.color, tokens);
      if (col) multiFills.push({ type: "SOLID", color: col, blendMode: f.blendMode as any });
    } else if (f.type === "GRADIENT_LINEAR" || f.type === "GRADIENT_RADIAL") {
      const grad = parseGradient(f.raw);
      if (grad) {
        if (f.blendMode) (grad as any).blendMode = f.blendMode;
        multiFills.push(grad);
        counters.gradient_mapped++;
      } else {
        counters.gradient_skipped++;
      }
    } else if (f.type === "IMAGE" && (f as any).src) {
      multiFills.push({
        type: "IMAGE",
        imageRef: (f as any).src,
        scaleMode: f.scaleMode ?? "FILL",
        blendMode: f.blendMode as any,
      });
    }
  }
  if (multiFills.length > 0) {
    out.fills = multiFills;
  }
}
```

(Legacy `fills` construction lines 272-287 are kept as fallback for nodes without `bg_fills`.)

- [ ] **Step 14.4: Test verify pass**

Run: `bun test test/probe-figma-bg-mapping.ts`
Expected: PASS.

- [ ] **Step 14.5: Regression**

Run: `bun smoke:figma && bun smoke:script:full`
Expected: PASS.

- [ ] **Step 14.6: Commit**

```bash
git add src/extractors/figma.ts test/probe-figma-bg-mapping.ts
git commit -m "feat(figma.ts): map bg_fills multi-layer → FigmaPaint[] with blendMode

bg_fills takes precedence over legacy single-fill construction.
Solid+gradient+image layers stacked honoring CSS z-order reversal.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 15: Emit multi-layer fills + blendMode + opacity in figma_emit.ts

**Files:**
- Modify: `src/lib/figma_emit.ts:112-129` (emitSolidOrGradientPaint) + fills emission block (lines ~212-235)

- [ ] **Step 15.1: Write failing test**

Create: `test/probe-emit-multi-bg.ts`

```ts
import { test, expect } from "bun:test";
import { emitFigmaPluginCode } from "../src/lib/figma_emit";

test("multi-fill FigmaNode emits fills[] with blendMode + IMAGE target deferred", () => {
  const doc: any = {
    schema: "cbm/htmltofigma/v0",
    source_url: "test://bg", captured_at: new Date().toISOString(),
    viewport: { width: 1440, height: 900 },
    document: {
      id: "0:0", name: "Document", type: "DOCUMENT",
      children: [{
        id: "0:1", name: "test", type: "CANVAS",
        backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
        children: [{
          id: "n0", name: "bg", type: "FRAME",
          absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 200 },
          fills: [
            { type: "GRADIENT_LINEAR",
              gradientStops: [
                { color: { r: 1, g: 0, b: 0, a: 0.5 }, position: 0 },
                { color: { r: 0, g: 0, b: 1, a: 0.5 }, position: 1 },
              ],
              gradientHandlePositions: [{x:0.5,y:0},{x:0.5,y:1},{x:1,y:0}],
              blendMode: "MULTIPLY",
            },
            { type: "IMAGE", imageRef: "https://example.com/img.png", scaleMode: "FIT", blendMode: "NORMAL" },
            { type: "SOLID", color: { r: 0, g: 1, b: 0, a: 1 }, blendMode: "NORMAL" },
          ],
        }],
      }],
    },
    warnings: [], text_dump: [],
    metrics: { nodes: 1, approx_tokens: 0, duration_ms: 0 },
  };
  const r = emitFigmaPluginCode(doc);
  const c = r.chunks[0].code;
  expect(c).toContain(".fills = [");
  expect(c).toContain('"blendMode":"MULTIPLY"');
  expect(r.image_targets.length).toBe(1);
  expect(r.image_targets[0].src).toBe("https://example.com/img.png");
});
```

- [ ] **Step 15.2: Test verify fail**

Run: `bun test test/probe-emit-multi-bg.ts`
Expected: FAIL.

- [ ] **Step 15.3: Extend emitSolidOrGradientPaint to honor blendMode**

In `src/lib/figma_emit.ts:112-129`, replace `emitSolidOrGradientPaint()` :

```ts
function emitSolidOrGradientPaint(p: FigmaPaint): string | null {
  function blendSuffix(): string {
    return p.blendMode && p.blendMode !== "NORMAL" ? `, blendMode: ${safeJson(p.blendMode)}` : "";
  }
  if (p.type === "SOLID" && p.color) {
    const a = p.color.a;
    const opacitySuffix = a !== undefined && a < 1 ? `, opacity: ${a}` : "";
    return `{ type: "SOLID", color: ${flattenColorRgb(p.color)}${opacitySuffix}${blendSuffix()} }`;
  }
  if ((p.type === "GRADIENT_LINEAR" || p.type === "GRADIENT_RADIAL") && p.gradientStops && p.gradientHandlePositions) {
    const stops = p.gradientStops.map((s) => ({
      color: { r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a ?? 1 },
      position: s.position,
    }));
    const transform = gradientTransformFromHandles(p.gradientHandlePositions);
    return `{ type: ${safeJson(p.type)}, gradientStops: ${safeJson(stops)}, gradientTransform: ${safeJson(transform)}${blendSuffix()} }`;
  }
  return null;
}
```

(Existing fills emission block ~lines 212-235 already iterates `node.fills`. Multi-fill stack auto-supported. IMAGE deferred upload_assets logic unchanged from S67 v0.10.3 — but IMAGE paint should now also include blendMode in image_targets capture if we want to apply blend post-upload — DEFERRED future, current upload_assets binds plain fill without blend. Document gap as warning.)

Also extend the IMAGE handling in emitNodeFlat (lines ~217-222) to pass blendMode through to image_targets if present (for future blend post-upload pattern) :

```ts
if (p.type === "IMAGE" && p.imageRef) {
  hasImageFill = true;
  const scaleMode = (p.scaleMode ?? "FILL") as "FILL" | "FIT" | "CROP" | "TILE";
  imageTargets.push({ src: p.imageRef, scaleMode });
  continue;
}
```

(Leave as-is. ImageTarget schema doesn't carry blendMode yet — future enhancement.)

- [ ] **Step 15.4: Test verify pass**

Run: `bun test test/probe-emit-multi-bg.ts`
Expected: PASS.

- [ ] **Step 15.5: Regression**

Run: `bun smoke:script:full`
Expected: PASS.

- [ ] **Step 15.6: Commit**

```bash
git add src/lib/figma_emit.ts test/probe-emit-multi-bg.ts
git commit -m "feat(emit): Q3c multi-fill emit + blendMode for SOLID/GRADIENT paints

emitSolidOrGradientPaint adds blendSuffix when paint.blendMode !== NORMAL.
IMAGE deferred upload_assets unchanged (blend post-upload deferred Couche 3).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 6 — Q3d Pseudo-element render emit (::before / ::after)

### Task 16: Lift pseudo-element capture to ClaudeNode.pseudo_before/after

**Files:**
- Modify: `src/extractors/htmltoclaude.ts` (lift existing S60 v0.6.0 pseudo capture to schema slots)
- Create: `test/smoke-pseudo-render.ts`

**Note:** S60 v0.6.0 ships `::before`/`::after` extraction. Confirm where pseudo data currently lives (likely a sibling array or warning entries) and route into new `pseudo_before` / `pseudo_after` slots on parent ClaudeNode.

- [ ] **Step 16.1: Locate existing pseudo capture site**

Run: `grep -n "::before\|::after\|pseudo" src/extractors/htmltoclaude.ts | head -20`
Expected: lines listing pseudo capture invocations. Note line numbers.

- [ ] **Step 16.2: Write failing smoke**

Create: `test/smoke-pseudo-render.ts`

```ts
import { test, expect } from "bun:test";
import { extractClaudeBundle } from "../src/extractors/htmltoclaude";
import { chromium } from "patchright";

test("::before / ::after captured as pseudo_before / pseudo_after on parent", async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(`
    <html><head><style>
      .deco::before { content: ''; display:block; width:4px; height:20px; background:red; }
      .deco::after { content: 'NEW'; color:blue; }
    </style></head>
    <body>
      <span class="deco" style="display:flex;gap:8px">label</span>
    </body></html>
  `);
  const bundle = await extractClaudeBundle(page, { max_nodes: 30 });
  const decoNode = bundle.tree.find((n) => n.pseudo_before || n.pseudo_after);
  expect(decoNode).toBeDefined();
  expect(decoNode?.pseudo_before).toBeDefined();
  expect(decoNode?.pseudo_after).toBeDefined();
  expect(decoNode?.pseudo_after?.chars).toBe("NEW");
  await browser.close();
});
```

- [ ] **Step 16.3: Test verify fail (or empty pseudo slots)**

Run: `bun test test/smoke-pseudo-render.ts`
Expected: FAIL — pseudo_before/after undefined on extracted ClaudeNode.

- [ ] **Step 16.4: Route existing S60 pseudo capture into new slots**

In `src/extractors/htmltoclaude.ts` evaluate block, find where pseudo content is gathered (per grep step 16.1). Refactor to emit per-element :

```js
// Q3d v1.3.0 — Pseudo-elements lifted from S60 capture to schema slots
function extractPseudoNode(el, position /* "before" | "after" */) {
  const ps = getComputedStyle(el, `::${position}`);
  const content = ps.getPropertyValue("content");
  if (!content || content === "none" || content === "normal") return null;

  // Strip surrounding quotes for content string ; preserve url() / counter() raw
  let chars = "";
  const stringMatch = content.match(/^["'](.*)["']$/);
  if (stringMatch) chars = stringMatch[1];

  const box = { x: 0, y: 0, width: parseFloat(ps.width) || 0, height: parseFloat(ps.height) || 0 };
  return {
    id: `${el.dataset?.ebmId || "pseudo"}-${position}`,
    type: chars ? "TEXT" : "FRAME",
    box: [box.x, box.y, box.width, box.height],
    chars: chars || undefined,
    fill: ps.backgroundColor || undefined,
    color: ps.color || undefined,
    text_props: chars ? extractTextProps(el, ps) : undefined,
    effects: extractEffects(el, ps),
    bg_fills: extractBgFills(el, ps),
    layout: extractLayout(el, ps),
  };
}
```

Then per-element after layout/effects/bg_fills assignment :

```js
const pb = extractPseudoNode(el, "before");
const pa = extractPseudoNode(el, "after");
if (pb) node.pseudo_before = pb;
if (pa) node.pseudo_after = pa;
```

- [ ] **Step 16.5: Test verify pass**

Run: `bun test test/smoke-pseudo-render.ts`
Expected: PASS.

- [ ] **Step 16.6: Regression**

Run: `bun smoke:claude && bun smoke:script:full`
Expected: PASS.

- [ ] **Step 16.7: Commit**

```bash
git add src/extractors/htmltoclaude.ts test/smoke-pseudo-render.ts
git commit -m "feat(extract): Q3d lift ::before/::after to pseudo_before/pseudo_after slots

Pseudo capture re-using extractTextProps/Effects/BgFills/Layout helpers.
content '...' stripped to chars ; content url()/counter() preserved future.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 17: Emit pseudo nodes as Figma children in figma.ts + figma_emit.ts

**Files:**
- Modify: `src/extractors/figma.ts:332-334` (children loop)
- Modify: `src/lib/figma_emit.ts:250-254` (children loop)

- [ ] **Step 17.1: Write failing test**

Create: `test/probe-pseudo-emit-children.ts`

```ts
import { test, expect } from "bun:test";
import { bundleToFigma } from "../src/extractors/figma";
import { emitFigmaPluginCode } from "../src/lib/figma_emit";

test("pseudo_before/after appended as Figma children pre/post existing children", () => {
  const bundle: any = {
    schema: "cbm/htmltoclaude/v1",
    url: "test://pseudo", captured_at: new Date().toISOString(),
    viewport: { w: 1440, h: 900 }, tokens: { colors: {}, fonts: {} },
    tree: [{
      id: "n0", type: "FRAME", box: [0, 0, 200, 50],
      pseudo_before: { id: "n0-before", type: "FRAME", box: [0, 0, 4, 20], fill: "rgb(255,0,0)" },
      pseudo_after: { id: "n0-after", type: "TEXT", box: [50, 0, 30, 20], chars: "NEW", color: "rgb(0,0,255)" },
      children: [{ id: "n1", type: "TEXT", box: [10, 0, 40, 20], chars: "label" }],
    }],
    warnings: [], text_dump: [],
  };
  const doc = bundleToFigma(bundle);
  const root = doc.document.children[0].children[0];
  expect(root.children?.length).toBe(3);
  expect(root.children?.[0].id).toBe("n0-before");
  expect(root.children?.[1].id).toBe("n1");
  expect(root.children?.[2].id).toBe("n0-after");
  const emit = emitFigmaPluginCode(doc);
  const code = emit.chunks[0].code;
  expect(code).toContain('"n0-before"');
  expect(code).toContain('"n0-after"');
});
```

- [ ] **Step 17.2: Test verify fail**

Run: `bun test test/probe-pseudo-emit-children.ts`
Expected: FAIL.

- [ ] **Step 17.3: Extend children construction in figma.ts**

In `src/extractors/figma.ts:332-334` `convertNode()`, replace :

```ts
if (n.children?.length) {
  out.children = n.children.map((c) => convertNode(c, tokens, counters));
}
```

with :

```ts
const childrenList: FigmaNode[] = [];
if (n.pseudo_before) {
  childrenList.push(convertNode(n.pseudo_before, tokens, counters));
}
if (n.children?.length) {
  for (const c of n.children) childrenList.push(convertNode(c, tokens, counters));
}
if (n.pseudo_after) {
  childrenList.push(convertNode(n.pseudo_after, tokens, counters));
}
if (childrenList.length > 0) out.children = childrenList;
```

(`figma_emit.ts` children walker line 250-254 already iterates `node.children` — pseudo nodes flow through unchanged.)

- [ ] **Step 17.4: Test verify pass**

Run: `bun test test/probe-pseudo-emit-children.ts`
Expected: PASS.

- [ ] **Step 17.5: Regression**

Run: `bun smoke:figma && bun smoke:script:full`
Expected: PASS.

- [ ] **Step 17.6: Commit**

```bash
git add src/extractors/figma.ts test/probe-pseudo-emit-children.ts
git commit -m "feat(figma.ts): pseudo_before/after as Figma children pre/post existing children

convertNode appends pseudo nodes to children list preserving CSS document order.
figma_emit.ts walker unchanged — pseudo flows through standard children emit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 7 — Live regression + smoke:script:full update + ship v0.11.0

### Task 18: Update smoke:script:full to verify new emit features

**Files:**
- Modify: `test/smoke-figma-script-full.ts`

- [ ] **Step 18.1: Read current smoke:script:full**

Run: `cat test/smoke-figma-script-full.ts | head -80`

- [ ] **Step 18.2: Add assertions for new emit features**

In `test/smoke-figma-script-full.ts`, after existing chunk parse assertions, add :

```ts
// v0.11.0 — new emit features must surface in chunk code
const fullCode = chunks.map((c) => c.code).join("\n");
const v0110Features = [
  ".layoutMode",
  ".effects =",
  ".letterSpacing",
  ".paddingTop",
];
for (const feature of v0110Features) {
  if (!fullCode.includes(feature)) {
    console.warn(`[v0.11.0 smoke] expected emit feature not present : ${feature}`);
  }
}
// Don't FAIL if absent (Awwwards SOTD might not exercise every prop) — log only.
```

- [ ] **Step 18.3: Run updated smoke**

Run: `bun smoke:script:full`
Expected: PASS — Awwwards SOTD bundle still chunks correctly + warns if features absent.

- [ ] **Step 18.4: Commit**

```bash
git add test/smoke-figma-script-full.ts
git commit -m "test(smoke): smoke:script:full warns if v0.11.0 emit features absent

Logs (not fails) for layoutMode/effects/letterSpacing/paddingTop presence.
Awwwards SOTD may not exercise every prop ; goal = visibility not gate.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 19: Live regression Awwwards SOTD vs S69 baseline

**Files:** External Figma file (manual step)

- [ ] **Step 19.1: Run EBM on Awwwards SOTD via tools/to_figma_script**

Manual : Execute `to_figma_script` tool with `url: "https://www.awwwards.com/sites-of-the-day"`. Capture chunks output JSON.

- [ ] **Step 19.2: Paste chunks into fresh Figma file**

Manual : Create new Figma file `EBM-v0.11.0-livetest-{date}`. Paste chunk[0] via use_figma. Substitute + paste chunks[1..N]. Run `upload_assets` loop for image_targets.

- [ ] **Step 19.3: Side-by-side comparison vs S69 baseline**

Manual : Open S69 file `yFJNjHzCXWEk4gaGOmLzSA` + new v0.11.0 file side-by-side. Assess :
- Auto-Layout visible (containers reflow) Y/N
- Effects rendered (shadows + blurs) Y/N
- Multi-bg layers visible Y/N
- Pseudo-elements visible Y/N
- Overall "structure brute" gap closed Y/N

Document outcome in `research/LIVE-V0.11.0-REGRESSION-{date}.md` with screenshots + verdict.

- [ ] **Step 19.4: If gaps remain : open follow-up issues**

Manual : For each gap (e.g. nested grid columns not nested in auto-layout, certain shadows missing), create `research/ISSUE-V0.11.0-{slug}.md` with reproduction + fix plan. Defer to S72+ if non-blocking ship.

- [ ] **Step 19.5: Commit live regression report**

```bash
git add research/LIVE-V0.11.0-REGRESSION-*.md
git commit -m "test(live): v0.11.0 Awwwards SOTD regression vs S69 baseline

Side-by-side comparison + screenshots + gap assessment.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 20: Update README.md v0.11.0 ship section

**Files:**
- Modify: `README.md` (top version section)

- [ ] **Step 20.1: Read current README header**

Run: `head -80 README.md`

- [ ] **Step 20.2: Add v0.11.0 ship section**

In `README.md`, immediately after the `**v0.10.3** ...` paragraph, prepend new paragraph :

```markdown
**v0.11.0** (S71): Phase 3 v0.4 — Fidelity upgrade. Closes user-rejet S69 "structure brute" via gap-fill of figma_emit.ts + extractor pipeline. **Q2 Auto-Layout** : walk computed `display:flex|grid` + `justify-content` + `align-items` + `gap` + `padding` → emit FigmaNode `layoutMode`/`primaryAxisAlignItems`/`counterAxisAlignItems`/`itemSpacing`/`padding{Top,Right,Bottom,Left}`/`layoutSizing{Horizontal,Vertical}`. CSS Grid → outer VERTICAL stacking rows (nested columns deferred S72+). **Q3a Text props depth** : `letter-spacing` / `line-height` (px or AUTO) / `text-decoration` (UNDERLINE/STRIKETHROUGH) / `text-transform` (UPPER/LOWER/TITLE, applied at extract since Figma textCase semantics weaker) / `text-shadow` (multi CSV → DropShadow on TextNode). **Q3b Effects** : `box-shadow` (multi CSV + inset → DropShadow/InnerShadow) / `filter:blur(Npx)` → LayerBlur / `backdrop-filter:blur(Npx)` → BackgroundBlur. **Q3c Multi-bg** : CSV `background-image` (gradient + url() layers) honoring paren depth + per-layer `background-blend-mode` → paint BlendMode + `background-size cover|contain` → FILL|FIT. Solid bg-color appended last, reverse stack for Figma fills[] z-order. **Q3d Pseudo render** : `::before`/`::after` lifted from S60 v0.6.0 capture to schema slots `pseudo_before` / `pseudo_after`, emitted as Figma children pre/post existing children preserving CSS document order. **Bundle schema bumps v1.2.0 → v1.3.0** (forward-compat — all new fields optional, migration shim transparent). **Smokes** 8 base + 6 new = 14/14 PASS (`smoke:autolayout-flexbox`, `smoke:autolayout-grid`, `smoke:text-props`, `smoke:effects`, `smoke:multi-bg`, `smoke:pseudo-render`). Live regression Awwwards SOTD vs S69 baseline documented `research/LIVE-V0.11.0-REGRESSION-{date}.md`.
```

- [ ] **Step 20.3: Update package.json version**

In `package.json`, change `"version": "0.10.3"` to `"version": "0.11.0"`. Add new smoke scripts :

```json
"smoke:autolayout-flexbox": "bun test test/smoke-autolayout-flexbox.ts",
"smoke:autolayout-grid": "bun test test/smoke-autolayout-grid.ts",
"smoke:text-props": "bun test test/smoke-text-props.ts",
"smoke:effects": "bun test test/smoke-effects.ts",
"smoke:multi-bg": "bun test test/smoke-multi-bg.ts",
"smoke:pseudo-render": "bun test test/smoke-pseudo-render.ts"
```

- [ ] **Step 20.4: Run all 14 smokes verification**

Run: `bun smoke && bun smoke:claude && bun smoke:figma && bun smoke:paste && bun smoke:fonts && bun smoke:script && bun smoke:script:slim && bun smoke:script:full && bun smoke:autolayout-flexbox && bun smoke:autolayout-grid && bun smoke:text-props && bun smoke:effects && bun smoke:multi-bg && bun smoke:pseudo-render`
Expected: 14/14 PASS (or 14/14 with notes if some live-only smokes have known issues).

- [ ] **Step 20.5: Commit version bump**

```bash
git add README.md package.json
git commit -m "chore(release): v0.11.0 Fidelity upgrade

Q2 Auto-Layout + Q3 4 buckets (text props / Effects / multi-bg / pseudo render).
Bundle schema v1.3.0 forward-compat. 14/14 smokes PASS.
Closes user-rejet S69 'structure brute' via figma_emit.ts gap-fill.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 20.6: Tag release**

```bash
git tag -a v0.11.0 -m "v0.11.0 Fidelity upgrade — Auto-Layout + Effects + multi-bg + pseudo"
```

- [ ] **Step 20.7: Merge branch to main (after user review)**

```bash
git checkout main
git merge --no-ff v0.11.0-fidelity-upgrade -m "Merge v0.11.0 Fidelity upgrade (S71)"
```

(Do NOT push without user approval.)

---

## Phase 8 — Handoff S71 + transition S72

### Task 21: Write handoff S71 V2 format

**Files:**
- Create: `~/Vault/Obsidian-Brain/10-Sessions/2026/{MM}/S71-{date}-ebm-v0.11.0-fidelity-upgrade.md`

- [ ] **Step 21.1: Invoke handoff skill**

Run via Skill tool : `handoff` with args : V2 Vague 2+ Obsidian-only, theme = `ebm-v0.11.0-fidelity-upgrade`, chain_id = `browser-mcp`, chain_seq = 12.

Skill auto-generates handoff with BLUF + AAR-4Q + Reflexion + I-PASS Resume prompt embedded.

- [ ] **Step 21.2: Verify handoff includes**
- Files touched count + smokes 14/14 status
- Wave verdict (ship Y/N) + open items S72
- Live regression LIVE-V0.11.0-REGRESSION report ref
- Decision card cross-link to s70-d1
- Resume prompt embeds I-PASS directive for S72

### Task 22: Transition to S72 v0.12.0 Viewport matrix wave

**Files:** prep only — actual S72 plan written in S72 itself

- [ ] **Step 22.1: Note S72 scope reference in handoff**

In handoff S71 "Ce qu'il reste" section, include :
- S72 v0.12.0 wave : Q5 viewport matrix thin wrapper ~1.5-2j
- Read PLAN-EBM-HYBRID-ARCHITECTURE-S70-2026-05-20.md §Q5 Viewport matrix specs
- Default viewport set (desktop/tablet/mobile × light/dark = 6)
- Output N pages 1 Figma file via chunk pattern

- [ ] **Step 22.2: Confirm spec coverage S71 wave 1 complete**

Ship criteria S71 checklist :
- [ ] Q2 Auto-Layout extract + emit shipped (Tasks 3-6)
- [ ] Q3a Text props extract + emit shipped (Tasks 7-9)
- [ ] Q3b Effects extract + emit shipped (Tasks 10-12)
- [ ] Q3c Multi-bg extract + emit shipped (Tasks 13-15)
- [ ] Q3d Pseudo render shipped (Tasks 16-17)
- [ ] Smokes 14/14 PASS (8 base + 6 new)
- [ ] Live regression Awwwards SOTD vs S69 documented
- [ ] README v0.11.0 + package.json version bumped
- [ ] Handoff S71 written
- [ ] Decision card s70-d1 cross-linked
- [ ] Branch v0.11.0-fidelity-upgrade merged main (after user approval)

---

## Refs

- Source spec : `research/PLAN-EBM-HYBRID-ARCHITECTURE-S70-2026-05-20.md`
- PROBE S69 : `research/PROBE-EBM-VISUAL-HYBRID-S69-2026-05-18.md`
- Recon S60 : `research/HTMLTODESIGN-ECOSYSTEM-S60.md`
- Decision card : `~/Vault/Obsidian-Brain/30-Decisions/s70-d1-ebm-couche-2-gap-fill-scope-locked.md`
- Handoff S69 : `~/Vault/Obsidian-Brain/10-Sessions/2026/05/S69-2026-05-18-ebm-visual-hybrid-pivot-decision.md`
- Live S69 baseline EBM : https://www.figma.com/design/yFJNjHzCXWEk4gaGOmLzSA
- Live S69 h2d ref : https://www.figma.com/design/d37IFjeESbhGHl6RGhFBp5
- EBM source root : `~/Projects/Eclectique/eclectique-browser-mcp/`

## Self-Review

Spec coverage check :
- Q2 Layout (Auto-Layout mapper) ✓ Tasks 3-6
- Q3a Text props ✓ Tasks 7-9
- Q3b Effects ✓ Tasks 10-12
- Q3c Multi-bg ✓ Tasks 13-15
- Q3d Pseudo render ✓ Tasks 16-17
- Bundle schema v1.2.0 → v1.3.0 ✓ Tasks 1-2
- 6 new smokes ✓ Tasks 3.1 / 4.1 / 7.1 / 10.1 / 13.1 / 16.2
- Live regression ✓ Task 19
- README + version bump + 14 smokes ✓ Task 20
- Handoff + S72 transition ✓ Tasks 21-22

Placeholder scan : no TBD / TODO / "appropriate error handling" / "similar to Task N" without repeated code. Each step has exact commands + code blocks.

Type consistency : `ClaudeLayout` / `ClaudeTextProps` / `ClaudeEffect` / `ClaudeBgFill` defined Task 1.3 reused consistently Tasks 3.3 / 7.3 / 10.3 / 13.3. `FigmaNode` AutoLayoutMixin defined Task 2.3 reused Tasks 5.3 / 6.3. `safeJson` / `flattenColorRgb` / `gradientTransformFromHandles` helpers preserved from current `figma_emit.ts`. No orphan references.

Scope check : single Couche 2 Wave 1 ship target v0.11.0. Q5 viewport matrix explicitly deferred S72 Task 22. Couche 3 features (record_states / .ebm pack / etc.) explicitly deferred S73+.

---

## Execution Handoff

Plan complete and saved to `research/PHASE-S71-v0.11.0-implementation-plan.md`. User delegated Option 0 V2.3 for entire S70 brainstorm chain — proceed via `superpowers:subagent-driven-development` (recommended) when S71 starts.

**Default route on S71 start :**
1. Read S71 prompt de reprise (handoff S70 embeds I-PASS directive)
2. I-PASS Synthesis 3 bullets (a/b/c)
3. Invoke `superpowers:subagent-driven-development` skill with this plan as input
4. Fresh subagent per Task — review between tasks per skill workflow
