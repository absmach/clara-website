# Website maintenance

For setup and an overview, see the [repository README](../README.md).

## Where to edit

| Change | Source |
| --- | --- |
| Homepage and content examples | `src/home.html` |
| How it works, About, early access, privacy | Corresponding HTML files in `src/` |
| Docs and Blog | `scripts/resource-pages.mjs` |
| Header, footer, metadata, shared inquiry form | `scripts/build.mjs` |
| Layout, colors, responsive styles | `src/styles.css` |
| Gallery, navigation, dialogs, sample interactions | `src/site.js` |
| Logo and favicon | `src/assets/clara-bloom.svg`, `src/assets/clara-favicon-bloom.svg` |
| How it works illustrations | `src/assets/guide/` (seven SVG diagrams) |
| Real app screenshots | `src/assets/screenshots/` |

From either the repository root or this directory:

```sh
npm run build
npm run check
```

The preview serves `dist/` at [localhost:4173](http://localhost:4173). Rebuild and refresh after edits. Commit the regenerated `dist/` files with their source changes.

## Product tour

The homepage has one animated product tour: chat, content Plays, the LinkedIn brief dialog, and brand guidelines. How it works combines the Workflows and Agents tour, four agent roles, the marketing planner, and autonomy controls. Both galleries reserve a stable frame and caption area. Screenshots fill the frame and align to the top-left; wider captures are cropped in the preview. The full-size link opens the complete original capture. `/how-it-works/#workflow-screen` and `/how-it-works/#agent-screen` select and pause their respective slides. Old `/automation/` links redirect to How it works, preserving workflow, agent, and autonomy destinations. Without JavaScript, each tour shows its first screenshot. Capture screenshots from the running Clara app using fictional demo data, then update [PROVENANCE.txt](src/assets/screenshots/PROVENANCE.txt). Preserve authentic interface content and capture the logo from the app itself.

Each gallery advances independently every three seconds while visible. Visitors can pause it or select a tab; manual selection pauses playback. Keyboard focus, a hidden browser tab, and leaving the viewport suspend playback. Reduced-motion preferences disable automatic playback by default.

The Agents and Autonomy guides are in `scripts/resource-pages.mjs`. Product descriptions were checked against the adjacent Clara app’s `docs/agents.md`, `docs/autonomy.md`, and workflow documentation. The homepage introduces hands-on creation before workflows, agents, and autonomy. Its product images show the actual app; the workflow is a fictional demonstration saved as a draft and never run.

The separate Fieldnotes content examples are prewritten samples. They do not call a model or publish anything.

## Branding

**In bloom** is the approved logo: four turning petals, one coral accent, and a yellow center. Use the color master for the website and `src/assets/clara-bloom-mono.svg` for one-color applications. The favicon places the flower on a white rounded tile.

The earlier logo studies remain at `/logo-directions/` and `/logo-directions/bloom/`. They are built into `dist/`, but are not linked from the marketing navigation; they are not access-controlled.

## Before publishing

Run the build and static checks. Preview visual changes at desktop and mobile sizes, and exercise any interactions you changed. Static checks cover local links, fragments, assets, IDs, metadata, and accessible references; they do not replace browser review.

Deploy `dist/` to static hosting. Preserve directory URLs such as `/docs/` and configure `404.html` for missing pages. The old `/what-you-can-make/` route redirects to the homepage’s formats section.

The early-access form prepares an email to `info@absmach.eu`, with a copy fallback. Changing it to collect submissions requires an inquiry service. No inquiry storage or analytics is currently configured.

## Source and integration copy

Capabilities checked against the adjacent Clara checkout on 14 November 2026: `lib/clara/ingestion.ex` reads web, GitHub, local, PDF, and document sources; `lib/clara/knowledge_sources.ex` queues source ingestion (including a product's website). `lib/clara/integrations/providers.ex` and `builtin_connector.ex` implement GitHub, Slack notifications, Jira context, Gmail, Search Console, Strapi, and newsletter operations; `docs/slack-listening.md` describes opt-in channel conversations and reviews. These are implementation checks, not live account connection tests. Do not imply every connector automatically becomes a knowledge source, or that every source continuously syncs by default.

The verified Google performance integration is **Google Search Console**, not Google Analytics. Drive and Calendar appear in shared Google authorization documentation but were not verified as implemented connector operations, so they are not advertised here. LinkedIn and X publishing, plus Mailchimp and listmonk newsletters, are separate from knowledge ingestion.

## Marketing planner

Planner copy was checked against the adjacent app’s `docs/planning.md`, `lib/clara/planning.ex`, and `lib/clara/planning/context.ex`, and `lib/clara_web/live/calendar_live.ex` on 14 November 2026. The planner combines priorities, product context, available market signals, and agent lessons; proposes objectives; and books enabled agent jobs on Calendar. It runs weekly or on request. Bookings are work start times, not guaranteed publication times. Workflow approvals, autonomy settings, guardrails, and budgets still apply. This is a source verification, not a live planner run.
