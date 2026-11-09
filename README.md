# Clara website

Clara’s product website, informed by the Clara application and the Atomic website. The standalone project lives in `site/`; hosting serves `site/dist/`.

```sh
npm run dev     # build and serve at http://127.0.0.1:4173
npm run build   # generate the static site
npm run check   # check JavaScript and local pages/assets
```

No package installation is required. Node.js 22 or later is sufficient. Re-run the build after editing source files; the preview serves the generated files.

The site includes a homepage with animated product screenshots and interactive content examples, a workflow guide, an about page, Docs with four guides, Blog with two articles, an early-access inquiry page, website privacy information, and a 404 page. The former standalone content-formats route redirects to the homepage. The header and footer, metadata, and inquiry forms are shared by `site/scripts/build.mjs`. Page content, styles, and interactions live in `site/src/`. Local Inter fonts and their license are included.

Early-access links open an accessible dialog; opening the link in another tab or without JavaScript uses the standalone page. The form prepares an email to the existing Abstract Machines contact, `info@absmach.eu`. It does not submit or store inquiries. The visitor reviews and sends the email. No signup backend or analytics is configured.

The campaign demonstration uses fictional Fieldnotes content. Tabs switch prewritten examples, and visitors can copy the selected sample. It does not invoke a model or publish content. The product gallery contains unmodified screenshots of the actual running Clara Phoenix application, captured in a separate local demo workspace. Hero artwork and the separate content examples remain explicitly fictional.

The website uses Inter typography, violet actions, warm white surfaces, and sunshine yellow, coral, pink, and peach accents. The Morse-code C mark retains its geometry with violet bars and coral dots. The editorial layout combines serif accents with playful illustrations and brief entrance motion that respects reduced-motion preferences. The compact footer and shared navigation include Docs and Blog.

Product claims were checked against `../clara/README.md`, `../clara/lib/clara_web/live/home_live.ex`, the campaign catalog, publishing implementations, and carousel/video guides. The older generated documentation still describes a prior Python service, so it was not used as the product source of truth. Pricing, launch dates, customer statistics, and future sales/CRM capabilities are intentionally not presented as available features.

Before a public launch, choose the final domain, confirm access availability, and connect an approved inquiry service if email is no longer the desired flow. The earlier Sites preview is not updated by this local revision. The current version is served locally at http://localhost:4173.
