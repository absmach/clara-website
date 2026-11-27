---
title: Find information
description: Search your sources the way Clara does, and pin, correct or exclude passages that Clara reads.
order: 5
---
# Find information

**Find information** searches the knowledge Clara has read from your sources and memory. Use it to check what Clara knows before it writes, and to fix passages that are wrong.

**Where to find it:** sidebar → **Brand & knowledge** → **Find information**

This is not the search box in the page header. That one finds pages, plays and your work. See [Search](/docs/chat/search).

## Search your knowledge

1. Open **Find information**. The heading reads "Find the context behind an idea."
2. Type a question in the box that says "What does your product help teams do?"
3. Under **Product**, choose **All products** or one product.
4. Under **Evidence up to**, choose **Tier 1 only**, **Tiers 1-2**, **Tiers 1-3** or **All tiers**. A lower tier limit shows only the most reliable sources.
5. Click **Search**.

<video src="/assets/docs/context/search-knowledge.mp4" poster="/assets/docs/context/search-knowledge.jpg" autoplay muted loop playsinline aria-label="Typing What does Acme Analytics help teams do? on Find information and clicking Search; passages from the Acme Analytics product guide appear, then How was this found? shows the search details"></video>

**You should see:** the matching passages, each with the page or file it came from. If nothing matches, you see "No results found."

Click **How was this found?** to see how the search worked: what was searched for, the **Keyword matches** and **Meaning matches**, the **Knowledge graph** and the **Reranker**. Click **Hide details** to close it.

If nothing has been read yet, Clara says so and points to the **Sources** tab. If the sources are limited to products you can't open, you see "The sources that hold knowledge are limited to products you don't have access to. Ask an admin if you need to see them." If the tier filter hides everything, try **All tiers**.

## Fix what Clara reads

Organization admins see three buttons on each passage: **Pin**, **Correct** and **Exclude**.

- **Pin** keeps a passage visible even when a relevance floor would hide it. The passage shows **Pinned**, and the button becomes **Unpin**. A passage that comes from Memory can't be pinned.
- **Correct** lets you replace the text. Write what the passage should say under "Write what this should say", then click **Save correction**. The passage shows **Corrected by you** and **Pinned**, and your text replaces the original everywhere Clara reads. The source itself isn't changed.
- **Exclude** stops Clara using the passage.

<video src="/assets/docs/context/search-correct.mp4" poster="/assets/docs/context/search-correct.jpg" autoplay muted loop playsinline aria-label="Clicking Correct on a Find information result, replacing the text with a corrected sentence and clicking Save correction; the passage shows the new text with Corrected by you and Pinned"></video>

Memory results are labelled "Memory ·" followed by the kind. You can exclude them, but not pin or correct them.

> **Note:** Pinning, correcting and excluding are for organization admins. Everyone else can search and read.

> **Note:** Exclude and Correct can't be undone from the app yet. Check the passage before you change it.

## FAQ

**What are tiers?** The **Authority tier** you set on each source, from **1 · Authoritative** to **4 · External**. **Evidence up to** limits the search to sources at or above that tier. See [Knowledge sources](/docs/context/knowledge-sources).

**Does Correct change the original source?** No. It replaces the text only in what Clara reads. The website or file stays the same.

**Why does a result say Memory?** It comes from something Clara kept, such as a chat, a finished draft or a web page it read. You can turn these off under **Memory** on the **Sources** tab.

## Next steps
- [Knowledge sources](/docs/context/knowledge-sources)
- [Diagnostics](/docs/context/knowledge-diagnostics)
- [Search](/docs/chat/search)
