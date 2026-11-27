# Writing the Clara user guide

This file is for people who write docs. It isn't rendered as a page on the site.

The guide is plain Markdown. Assistants, tools and people read the same files. `pnpm run build` turns them into HTML pages, a raw `.md` copy of each page, `/llms.txt` and `/llms-full.txt`.

## Add a page

1. Pick a section folder from `site/docs/sections.json`. Create `site/docs/<section>/<slug>.md`. The slug becomes the address: `/docs/<section>/<slug>/`.
2. Copy the page template below.
3. Run `pnpm run build && pnpm run check`, then open the page with `pnpm run dev`.
4. Commit your page. `site/dist/` is generated and not committed.

To add a section, add it to `sections.json` and create its folder. A section with no pages doesn't appear on the site. To move or rename a page, add its old address to `site/docs/redirects.json`.

Sections are listed in the order of `sections.json`. Pages inside a section are sorted by `order`, then by title. Use `tag: Limited availability` for features that only some workspaces have. It adds a pill in the sidebar and a one-line note under the title. No other tag exists.

## Page template

````md
---
title: Plays
description: Pick a format, give Clara a brief and get a first draft.
order: 2
---
# Plays
<2–3 sentences: what this is and when to use it.>

**Where to find it:** sidebar → **Plays**

## <Task name>
1. Numbered steps, UI labels in **bold** exactly as the app shows them.

> **Note:** permissions, approvals and autonomy, limits, gotchas.

<video src="/assets/docs/create/plays.mp4" poster="/assets/docs/create/plays.jpg" autoplay muted loop playsinline aria-label="Running the LinkedIn post play from the Plays page"></video>

## FAQ
**Question?** Short answer.

## Next steps
- [Related page](/docs/create/campaigns)
````

Front matter has `title`, `description` and `order` (a number), plus the optional `tag`, `popular` and `task`. Each page has one `#` heading and ends with a `## Next steps` list that links to at least one other docs page. Link to other pages as `/docs/<section>/<slug>`, without a trailing slash. `pnpm run check` fails when a link doesn't resolve.

## Popular tasks on the docs home

The docs home lists up to seven pages under **Popular tasks**. Add `popular: <number>` to a page's front matter to put it there. Lower numbers come first. `task` is an optional short, verb-first label for the link, such as `task: Write your first draft`. Without it the page title is used, so leave it out when the title already starts with a verb. `task` only works together with `popular`. `pnpm run check` fails when `popular` isn't a number or `task` is empty.

## Writing rules

- Write in plain English, second person, short sentences. No marketing tone.
- Use the product name "Clara" only. The check fails on any older name.
- Describe what the user sees. Don't use internal terms (tenant, job IDs, sandbox, Atom).
- Bold UI labels and keep their exact spelling and casing.
- Don't add screenshots. Use clips only, and only where motion helps.
- Bots can't watch video. The steps in the text must cover the whole flow without the clip.
- Billing, plans, prices and the Usage tab are out of scope until billing is final.

## Clips

Embed a clip with a plain `<video>` tag, as in the template. Keep the `aria-label`: it is the clip's text description. Clips live in `site/src/assets/docs/<section>/<name>.mp4` (or `.webm`) next to a `<name>.jpg` poster frame. Reference them as `/assets/docs/<section>/<name>.mp4`.

On the site the clips start playing on their own, muted and looping. Visitors who prefer reduced motion, and visitors without JavaScript, see the poster and play controls instead. `pnpm run check` fails when a clip or poster file is missing, or when the poster or `aria-label` is missing.

## Recording guide

- Record on a seeded demo workspace: demo organization, fictional product, no real customer data and no real social accounts on screen.
- Use a 1440×900 browser window, light theme, 100% zoom and a visible cursor. Hide personal bookmarks and extensions.
- Each clip is 5–20 seconds long, silent, and loops cleanly. Export it at 1280px wide as H.264 MP4, under 2 MB. WebM is optional. Add a poster frame.
- Cut out waiting time (generation, syncing) instead of showing spinners.
- Name files after the task, for example `create/plays.mp4` and `create/plays.jpg`.
- Clara's own walkthrough capture (**Videos → Captures**) can record clips.
