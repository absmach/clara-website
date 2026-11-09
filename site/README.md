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
| Real app screenshots | `src/assets/screenshots/` |

From either the repository root or this directory:

```sh
npm run build
npm run check
```

The preview serves `dist/` at [localhost:4173](http://localhost:4173). Rebuild and refresh after edits. Commit the regenerated `dist/` files with their source changes.

## Product tour

The homepage gallery uses three 1440 × 1000 captures: content plays, the LinkedIn brief dialog, and brand guidelines. Capture them from the running Clara app using fictional demo data, then update [PROVENANCE.txt](src/assets/screenshots/PROVENANCE.txt). Preserve authentic interface content and capture the logo from the app itself.

The gallery advances every three seconds while visible. Visitors can pause it or select a tab; manual selection pauses playback. Keyboard focus, a hidden browser tab, and leaving the viewport suspend playback. Reduced-motion preferences disable automatic playback by default.

The separate Fieldnotes content examples are prewritten samples. They do not call a model or publish anything.

## Branding

**In bloom** is the approved logo: four turning petals, one coral accent, and a yellow center. Use the color master for the website and `src/assets/clara-bloom-mono.svg` for one-color applications. The favicon places the flower on a white rounded tile.

The earlier logo studies remain at `/logo-directions/` and `/logo-directions/bloom/`. They are built into `dist/`, but are not linked from the marketing navigation; they are not access-controlled.

## Before publishing

Run the build and static checks. Preview visual changes at desktop and mobile sizes, and exercise any interactions you changed. Static checks cover local links, fragments, assets, IDs, metadata, and accessible references; they do not replace browser review.

Deploy `dist/` to static hosting. Preserve directory URLs such as `/docs/` and configure `404.html` for missing pages. The old `/what-you-can-make/` route redirects to the homepage’s formats section.

The early-access form prepares an email to `info@absmach.eu`, with a copy fallback. Changing it to collect submissions requires an inquiry service. No inquiry storage or analytics is currently configured.
