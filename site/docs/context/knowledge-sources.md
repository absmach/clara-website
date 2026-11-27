---
title: Knowledge sources
description: Add the websites, docs, repositories and files Clara reads, and keep them up to date.
order: 4
---
# Knowledge sources

A source is a place Clara reads to learn about your business: your website, your docs, a GitHub repository, a Notion page or a file. Agents, chats and plays use sources to write accurately about what you offer.

**Where to find it:** sidebar → **Brand & knowledge** → **Sources**

Organization sources are available across products. Product sources keep their product's access boundaries, so only people with access to that product can use them.

## Add a website source

1. Open **Sources** and click **Add source**. The dialog says "Add a little more context."
2. Under **Attach to**, choose **Organization** or a product.
3. Under **Source type**, choose **Website / Docs**.
4. Enter the **Website / docs URL**, for example https://example.com.
5. Optional: set **Web crawl depth**, and **JavaScript rendering** to **Automatic: render pages that look incomplete**, **Always render every page** or **Never render**.
6. Optional: set the **Authority tier** (see below).
7. Click **Add Source**.

<video src="/assets/docs/context/sources-add-website.mp4" poster="/assets/docs/context/sources-add-website.jpg" autoplay muted loop playsinline aria-label="Clicking Add source, leaving Attach to on Organization and Source type on Website / Docs, typing https://example.com and clicking Add Source; the new row shows syncing and then Ready"></video>

**You should see:** a new row in the table. It moves through the syncing states and ends at **Ready**. The first sync of a large site can take several minutes.

## Add other kinds of source

- **GitHub repo.** Enter **GitHub repo** as owner/repo, and an optional **Include pattern** such as docs/, README.md.
- **Upload document (PDF, Word, Markdown, text, SVG).** Drag a file in, or click to browse. Files can be up to 20 MB.
- **Notion page or database.** Paste the **Notion page or database link**. Share it with Clara's integration in Notion first (••• → Connections), and connect Notion under Connectors. A page brings the pages and databases inside it. A database brings its rows.

Google Drive folders are added from the Google Drive connection page, not from this dialog. To change them later, you see "Change Drive folders on the Google Drive connection page."

## Authority tier

**Authority tier** says how much Clara should trust a source.

- **Automatic (from the source and its site)**: Clara decides.
- **1 · Authoritative**, **2 · Strong evidence**, **3 · Contextual** or **4 · External**: you choose.

In [Find information](/docs/context/knowledge-search) you can search up to a tier: **Tier 1 only**, **Tiers 1-2**, **Tiers 1-3** or **All tiers**.

## Read the sources table

The table has the columns **Source**, **Status**, **Scope** and **Last sync** ("Not yet" before the first sync). Status shows one of these:

- **Ready**
- **Ready, with warnings**
- **Syncing: building knowledge graph**
- **Syncing: embedding chunks (N left)**, where N is the number of chunks left
- **Synced, but no text found**
- **Synced, embeddings failed (keyword search only)**
- **Sync failed: knowledge graph failed**
- **Error**
- **pending**, **syncing** and **disabled**, shown in lower case while a source is queued, being read or turned off

When something needs a look, **View details** opens [Diagnostics](/docs/context/knowledge-diagnostics) at that source.

## Keep sources up to date

- The sync button (tooltip **Sync now**) reads one source again. While a source is syncing, the button is **Cancel**.
- **Sync all** (top of the page) reads every source again.
- The row menu ("Actions for" the source) has **Edit**, **Disable** or **Enable**, and **Delete**. **Delete** asks "Delete source?" and warns "The source and all the knowledge Clara stored from it will be removed. This can't be undone."

With no sources you see "No sources configured yet. Add one to get started."

## Memory

Under the table, **Memory** is what Clara keeps from its own work so later chats and drafts can find it. Corrections you make in a chat win over older material. Memory is never added to the knowledge graph. Each kind has an **On** or **Off** switch, with counts:

- **Conversations**: general chats, and the files and links shared in them
- **Generated content**: finished drafts
- **Workflow memory**: run summaries, lessons and preferences
- **Web pages**: pages read to check what drafts and replies cited

> **Note:** Only organization admins can add, edit, sync or delete sources and change Memory. For everyone else the buttons are greyed out. Product sources are managed on the product's own **Sources** tab, and need manager access to that product. See [Product page and product access](/docs/context/product-page).

## FAQ

**What does Authority tier change?** It tells Clara how much to trust a source, and it lets you narrow a search to the most reliable sources.

**Why is my source stuck on syncing?** Large sites take longer. Open **View details** or the [Diagnostics](/docs/context/knowledge-diagnostics) tab to see what is happening, and use **Cancel** and **Sync now** to start over.

**Can Clara read private pages?** Only what the source can reach. A website source reads public pages. For Notion, share the page with Clara's integration first.

**How do I stop Clara using a source without deleting it?** Open the row menu and choose **Disable**. Choose **Enable** to bring it back.

## Next steps
- [Find information](/docs/context/knowledge-search)
- [Diagnostics](/docs/context/knowledge-diagnostics)
- [Products](/docs/context/products)
