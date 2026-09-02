import { analyzePage, closeShared } from "../src/tools/analyze_page.js";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const BASE = "https://allande-lingerie.myshopify.com";
const PREVIEW = "preview_theme_id=198708035932";

const PAGES = [
  { slug: "product", path: "/products/body-a-fleur-de-ligne" },
  { slug: "cart", path: "/cart" },
  { slug: "search", path: "/search?q=lingerie" },
  { slug: "page-faq", path: "/pages/faq" },
  { slug: "page-contact", path: "/pages/contact" },
  { slug: "page-essayage", path: "/pages/essayage-sur-mesure" },
  { slug: "page-guide-tailles", path: "/pages/guide-des-tailles" },
  { slug: "page-devenir", path: "/pages/devenir-conseillere" },
  { slug: "account-login", path: "/account/login" },
  { slug: "blog", path: "/blogs/news" },
  { slug: "404", path: "/404-does-not-exist" },
];

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

try {
  for (const page of PAGES) {
    for (const vp of VIEWPORTS) {
      const label = `${page.slug}-${vp.name}`;
      const sep = page.path.includes("?") ? "&" : "?";
      const url = `${BASE}${page.path}${sep}${PREVIEW}`;
      try {
        const bundle = await analyzePage({
          url,
          viewport: { width: vp.width, height: vp.height },
          outputs: ["screenshot", "a11y"],
          cookie_consent: "auto",
          timeout_ms: 45000,
        });
        const summary = {
          label,
          url: bundle.url,
          duration_ms: bundle.duration_ms,
          warnings: bundle.warnings,
          screenshot_path: bundle.screenshot?.path,
          a11y_violations: bundle.a11y?.violations?.length ?? 0,
        };
        console.log(JSON.stringify(summary));
        await writeFile(resolve(import.meta.dir, "..", "out", `87c-${label}.json`), JSON.stringify(bundle, null, 2));
      } catch (e: any) {
        console.log(JSON.stringify({ label, error: String(e?.message ?? e).slice(0, 200) }));
      }
    }
  }
} finally {
  await closeShared();
}
