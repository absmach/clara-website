# Clara product website

A dependency-free static website for Clara. Node.js 22+ is sufficient; no installation is needed.

```sh
npm run dev
npm run build
npm run check
```

The preview runs at `http://127.0.0.1:4173`. Edit `src/` and rebuild to update it. The build script owns shared navigation, footer, metadata, and the early-access form. Static hosting serves `dist/`; `.openai/hosting.json` retains the Sites identity.

The 14 generated pages include the homepage with content formats and examples, workflow guide, about page, early-access inquiry, website privacy, 404, Docs overview and four guides, and Blog overview and two articles. `scripts/resource-pages.mjs` owns the Docs and Blog content; the guides describe the current Phoenix workspace rather than the legacy CLI/Next.js documentation. Inter and its license are included locally. The approved “In bloom” mark uses four turning petals: three violet, one coral, and a sunshine-yellow heart. `src/assets/clara-bloom.svg` is the website master; `clara-bloom-mono.svg` is the one-color variant. The favicon uses the same flower on a white rounded tile, with a dedicated `clara-favicon-bloom.svg` URL to avoid the previous favicon’s browser cache. The website pairs Clara violet with coral, sunshine yellow, pink, and peach illustration accents on a warm white background. Decorative hero shapes and cards enter once (under four seconds); reduced-motion preferences disable their animation. No third-party image or analytics requests are made.

The gallery includes three actual screenshots of the running Phoenix app: content plays, the LinkedIn brief dialog, and populated brand guidelines. The gallery cycles every three seconds while in view, crossfades between screens, and provides a pause/play control. Manual tab selection pauses rotation; keyboard focus, hidden browser tabs, and leaving the viewport suspend playback. Reduced-motion preferences disable automatic playback by default. These screens were captured with Chromium at 1440 × 1000 in an isolated local screenshot database. No screenshot pixels or application DOM were edited. The demo workspace contains fictional Fieldnotes data, and no generation or publishing was run. See `src/assets/screenshots/PROVENANCE.txt`.

The homepage content samples are prewritten content for the fictional Fieldnotes product. They can be explored and copied, but do not generate or publish anything. The early-access form opens an email draft to `info@absmach.eu`, with a copy fallback. The visitor must send it. No signup backend, inquiry storage, or analytics is configured.

The layout and product story were informed by the local Clara application and Atomic website. The retired temporary brand is not used. Current content and approval workflows are described; future sales/CRM features, pricing, launch dates, and customer claims are not represented as available.

Validation: static checks cover all local links, fragments, assets, IDs, metadata, and accessible references. Chromium checks covered five pages at 320, 390, 768, 1024, and 1440 pixels, plus tab keyboard navigation, clipboard fallbacks, FAQ expansion, dialog behavior, email drafts, mobile navigation, a 404, and the no-JavaScript contact path.

The shared footer provides Product, Create, Resources, and Company navigation with compact 13px desktop links, 14px mobile links, and 44px mobile link targets. Navigation includes Docs and Blog, indicates the current page, and switches to the mobile menu at 1150px. The About illustration uses layered working notes. Recent Chromium checks cover all 15 routes at 320, 390, 1151, and 1440 pixels, including navigation, content samples, footer sizing, and runtime errors.

The homepage contains the real application gallery, format cards, visual studio banner, and interactive Fieldnotes examples. The formats section is available on the homepage and through the footer; it has no separate header menu item. The former separate route redirects to that section, so the content is maintained in one place. Format descriptions and sample text use 15px type; controls and captions have also been enlarged.
