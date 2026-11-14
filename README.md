<p align="center">
  <img src="site/src/assets/clara-bloom.svg" width="72" height="72" alt="Clara’s In bloom logo" />
</p>

<h1 align="center">Clara</h1>
<p align="center"><strong>You make great things. Let’s tell the world.</strong></p>
<p align="center">The product website for Clara, an AI marketing team with Agents, Workflows, and configurable autonomy—from suggestions to automatic publishing.</p>

---

## Run locally

Requires **Node.js 22+**. No dependencies to install.

```sh
npm run dev
```

Open **[localhost:4173](http://localhost:4173)**. After editing source files, run `npm run build` and refresh the browser; the preview server does not watch for changes.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Build the site and start the local preview |
| `npm run build` | Generate the static site in `site/dist/` |
| `npm run check` | Check JavaScript syntax, page metadata, links, and assets |

## What’s inside

- **Product homepage** with real app screenshots, an animated product tour, and interactive content examples.
- **How it works and About** pages explaining Clara’s workflow and approach.
- **Docs and Blog** with product guides and introductory articles.
- **Early access** through an email draft that visitors review and send.

The site is static HTML, CSS, and JavaScript. Fonts and artwork are served locally. There is no inquiry database, analytics integration, or AI generation running on the website.

## Make changes

```text
site/
├── src/                    Page content, styles, scripts, and assets
├── scripts/
│   ├── build.mjs           Shared layout and page generation
│   ├── resource-pages.mjs  Docs and Blog content
│   ├── check.mjs           Static validation
│   └── serve.mjs           Local preview server
└── dist/                   Generated files for static hosting
```

Edit source files in `site/src/` or `site/scripts/`, then rebuild. Treat `site/dist/` as generated output; it is tracked alongside the source.

See the [maintenance guide](site/README.md) for specific editing locations and publishing notes.

## Brand and product imagery

Clara’s **In bloom** mark pairs violet petals with a coral accent and a sunshine-yellow heart. The site carries those colors through warm surfaces and playful editorial illustrations.

- [Color logo](site/src/assets/clara-bloom.svg) · [One-color logo](site/src/assets/clara-bloom-mono.svg) · [Favicon](site/src/assets/clara-favicon-bloom.svg)
- App screenshots are captured from the real Clara application using a fictional **Fieldnotes** workspace. See [capture provenance](site/src/assets/screenshots/PROVENANCE.txt).
- Hero illustrations and sample content are illustrative; they are separate from the real app screenshots.

## Build for hosting

```sh
npm run build
npm run check
```

Serve **`site/dist/`** with a static host that supports directory index pages. Use `404.html` as the not-found page. The build and preview commands do not publish the site.

Early-access inquiries currently open an email draft to **info@absmach.eu**. The visitor must send the email; the website does not submit or store it.

---

Built by [Abstract Machines](https://absmach.eu).
