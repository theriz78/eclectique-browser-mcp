import { analyzePage, closeShared } from "../src/tools/analyze_page.js";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const PREVIEW_URL = "https://allande-lingerie.myshopify.com/?preview_theme_id=198708035932";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const PAGES = [
  { slug: "home", url: PREVIEW_URL },
  { slug: "collection", url: "https://allande-lingerie.myshopify.com/collections/all?preview_theme_id=198708035932" },
];

try {
  for (const page of PAGES) {
    for (const vp of VIEWPORTS) {
      const label = `${page.slug}-${vp.name}`;
      console.log(`\n=== ${label} ===`);
      const bundle = await analyzePage({
        url: page.url,
        viewport: { width: vp.width, height: vp.height },
        outputs: ["screenshot", "a11y", "tokens"],
        cookie_consent: "auto",
        timeout_ms: 45000,
      });
      const summary = {
        url: bundle.url,
        viewport: bundle.viewport,
        duration_ms: bundle.duration_ms,
        warnings: bundle.warnings,
        screenshot_path: bundle.screenshot?.path,
        a11y_violations_count: bundle.a11y?.violations?.length ?? 0,
        a11y_violations_top: (bundle.a11y?.violations ?? []).slice(0, 5).map((v: any) => ({ id: v.id, impact: v.impact, nodes: v.nodes?.length })),
        tokens_colors: Object.keys(bundle.tokens?.colors ?? {}).length,
        tokens_fonts: Object.keys(bundle.tokens?.fonts ?? {}).length,
      };
      const outJson = resolve(import.meta.dir, "..", "out", `87c-${label}.json`);
      await writeFile(outJson, JSON.stringify(bundle, null, 2), "utf-8");
      console.log(JSON.stringify(summary, null, 2));
      console.log(`bundle -> ${outJson}`);
    }
  }
} finally {
  await closeShared();
}
