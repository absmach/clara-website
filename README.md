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
| `npm run check` | Check JavaScript syntax, page metadata, links, and assets, and run the Worker tests |
| `npm run dev:worker` | Build, then run the site and the form Worker together (see [Forms](#forms)) |

## What’s inside

- **Product homepage** with real app screenshots, an animated product tour, and interactive content examples.
- **How it works and About** pages explaining Clara’s workflow and approach.
- **Docs and Blog** with product guides and introductory articles.
- **Early access** and **Contact** forms, protected by Cloudflare Turnstile. Early-access requests go to Listmonk; contact messages are emailed to info@absmach.eu.

The site is static HTML, CSS, and JavaScript, plus a small Worker that handles the two forms. Fonts and artwork are served locally. There is no analytics integration or AI generation running on the website.

## Make changes

```text
worker/                     Form API (/api/early-access, /api/contact) and its tests
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

The site is hosted on **Cloudflare Workers** at **[claragtm.com](https://claragtm.com)**, as a Worker named `clara-website`. It serves `site/dist/` as static assets and runs `worker/index.js` only for `/api/*`. `cloudflare.config.ts` holds the Worker configuration, and `wrangler.config.ts` points the build at `site/dist`. The [`cf` CLI](https://developers.cloudflare.com/cf/) deploys it and hands the build to Wrangler. Both are pinned in the root `package.json`. They need Node.js 22.18 or newer (CI uses `.nvmrc`).

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

## Forms

Both forms post JSON to the Worker in `worker/index.js`. It checks the Cloudflare Turnstile token (including the hostname and the form's action) before anything else, and fails closed.

| Form | Endpoint | What happens |
| --- | --- | --- |
| Early access (`/early-access/` and the dialog on every page) | `POST /api/early-access` | Creates or updates a Listmonk subscriber on the Clara early-access list, with Clara's answers under `attribs.clara`, then sends the thank-you email once. Unsubscribed addresses are never resubscribed. |
| Contact (`/contact/`) | `POST /api/contact` | Sends a Listmonk transactional email to `info@absmach.eu` with Reply-To set to the visitor, then a confirmation email to the visitor. Both use the transactional API's external mode (Listmonk 6.0+), so the visitor isn't stored as a subscriber. |

**Configuration.** Vars are in `cloudflare.config.ts`. The Listmonk list and template IDs are in `LISTMONK_IDS` at the top. An ID of `0` switches that part off: no list makes `/api/early-access` answer 503, no thank-you template saves signups without an email, no contact template makes `/api/contact` answer 503, and no receipt template sends contact messages without a confirmation to the visitor. PR previews always use `0` and no Turnstile hostnames, so a preview never writes to the production list or emails the inbox. Two secrets are set on the Worker in the Cloudflare dashboard, or with `npx cf workers secrets update <NAME>`: `LISTMONK_API_TOKEN` (the `clara-website` API user) and `TURNSTILE_SECRET`. The public Turnstile site key is `TURNSTILE_SITEKEY` in `site/src/site.js`.

**Email templates** live in Listmonk as transactional templates: the early-access thank-you (it reads `.Subscriber.Attribs.clara`) the contact notification (it reads `.Tx.Data`: `name`, `email`, `company`, `topic`, `message`, `submitted_at`), and the contact receipt (it reads only `.Tx.Data.topic`). The receipt goes to an address the form can't verify, so it never repeats anything the visitor typed. Their logo is a PNG on the Abstract Machines image CDN, since Gmail blocks SVG.

**Privacy notice.** `NOTICE_VERSION` in `worker/forms.js` is sent with every submission and recorded on early-access subscribers. Update it whenever `site/src/privacy.html` changes. Pages built with an older version are rejected.

**Local run.** Copy `.dev.vars.example` to `.dev.vars` and run `npm run dev:worker`. On localhost the forms use Cloudflare's always-pass Turnstile test keys. Leave the IDs at `0` to try the forms without writing anywhere, or point `LISTMONK_URL` at a test instance.

---

Built by [Abstract Machines](https://absmach.eu).
