<p align="center">
  <img src="site/src/assets/clara-bloom.svg" width="72" height="72" alt="Clara’s In bloom logo" />
</p>

<h1 align="center">Clara</h1>
<p align="center"><strong>You make great things. Let’s tell the world.</strong></p>
<p align="center">The product website for Clara, an AI marketing team with Agents, Workflows, and configurable autonomy—from suggestions to automatic publishing.</p>

---

## Run locally

Requires **Node.js 22+**. Building and previewing need no dependencies; deploying does (see [Deploy](#deploy)).

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

## Deploy

The site is hosted on **Cloudflare Workers** at **[claragtm.com](https://claragtm.com)**. It's an assets-only Worker named `clara-website`. It serves `site/dist/` and runs no server code. `cloudflare.config.ts` holds the configuration, and the [`cf` CLI](https://developers.cloudflare.com/cf/) deploys it. `cf` is pinned in the root `package.json` and needs Node.js 22.18 or newer (CI uses `.nvmrc`).

| Trigger | Result |
| --- | --- |
| Pull request opened or updated | Builds, checks, and publishes a preview at `https://pr-<number>-clara-website.absmach.workers.dev`. The PR's **View deployment** link opens it. Preview URLs are not indexed. |
| Pull request closed or merged | Deletes that PR's preview |
| Push to `main` | Builds, checks, and deploys production |

CI also fails when the committed `site/dist/` doesn't match a fresh build, so commit regenerated files with their source changes. PRs from forks are built and checked but not published. The workflow is `.github/workflows/deploy.yml`, and it uses the repository secret `CLOUDFLARE_API_TOKEN`.

To deploy by hand, sign in once with `npx cf auth login` (using the Cloudflare account that owns claragtm.com) and run:

```sh
npm install
npm run deploy:check     # build, check, and validate without uploading
npm run deploy:preview   # publish a preview of the current branch
npm run deploy           # publish production to claragtm.com
```

`www.claragtm.com` redirects to `claragtm.com` (301) through a zone Redirect Rule, and the zone redirects HTTP to HTTPS. Unknown paths return `404.html` with a 404 status, and `/docs` redirects to `/docs/`.

Early-access inquiries currently open an email draft to **info@absmach.eu**. The visitor must send the email; the website does not submit or store it.

---

Built by [Abstract Machines](https://absmach.eu).
