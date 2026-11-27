---
title: Diagnostics
description: See whether each source is ready, what needs attention, and how to fix stuck or failed syncs.
order: 6
---
# Diagnostics

**Diagnostics** shows whether your knowledge is ready to answer from. For each source it says whether it is ready, working or needs attention, and why. The page refreshes by itself while work is running.

**Where to find it:** sidebar → **Brand & knowledge** → **Diagnostics**

## Read the summary

Three cards sit at the top:

- **Sources ready**: "Available to inform your work".
- **Needs attention**: for example "One source needs a fresh connection", "Source refresh in progress", "Everything is up to date" or "No sources added yet".
- **Last refresh**: the newest sync across your sources, or "Not yet".

Below them, each source that needs attention explains the problem in words. When a sync fails, the previous content stays available: "Your previous content is still available."

## Check each source

**Source health** ("Availability, scope, and latest refresh") lists every source with these columns: **State**, **Source**, **Passages**, **Graph**, **Synced** and, for people who manage sources, **Actions**. **State** is one of:

- **Ready**
- **Working**
- **Needs attention**
- **Disabled** ("Disabled: not used for answers.")

**Manage sources** takes you to the **Sources** tab. With no sources you see "No sources yet. Add one on the Sources tab."

## Fix a source

The **Actions** column shows what applies to the source:

- **Cancel** stops a sync that is running.
- **Resync** reads the source again. You see "Resync queued."
- **Embed** prepares passages that are missing their embeddings, so meaning search works. You see "Embedding queued."
- **Rebuild graph** builds the knowledge graph again after a failure. You see "Knowledge graph build queued."

A failing source card also has **Sync again**.

<!-- CLIP: context/diagnostics-resync — Diagnostics: a source in Needs attention, click Resync, Resync queued appears -->

For many stuck items at once, click **Repair stuck work** at the top of the page. You see "Nothing needed repair." when there was nothing to fix, or a line saying what was queued again.

> **Note:** Only organization admins see the action buttons and **Repair stuck work**. Everyone else can read the page.

## FAQ

**What does Embed do?** It adds the meaning-based index for passages that were read but not embedded. Without it, Clara can only match keywords.

**When should I rebuild the graph?** When the graph column shows a failure for a source.

**Why does a source say it needs a fresh connection?** The access Clara had to the source expired or was removed. Reconnect it from **Connectors** or edit the source, then resync.

## Next steps
- [Knowledge sources](/docs/context/knowledge-sources)
- [Find information](/docs/context/knowledge-search)
