---
title: Skills
description: Save reusable instructions as skills, and use them in chats, plays and workflow steps.
order: 7
---
# Skills

A skill is a set of reusable instructions, such as "write release notes the way we do". Plays, chats and workflow steps can run a skill. Saving a skill makes it live at once. Your brand guidelines are always included on top. Agents can use skills too: add a skill step to an agent's job in the workflow builder. The ready-made agents don't use your skills until you add one.

**Where to find it:** sidebar → **Brand & knowledge** → **Skills**

The page says "Choose a skill, start a chat, and describe your task." Each skill is a card with its name, description, a status badge such as **Live** with its version (for example v1), a risk badge, and "N runs ·" followed by where it came from: **Built in chat**, **Uploaded**, **Imported from GitHub** or **Created from an MCP client**. Click **View instructions** to read it, or **Use in chat** to start a chat with it.

Status can be **Live**, **Archived**, **Rejected** or **Not live**. The risk badge is **Read**, **Analyze**, **Reversible**, **External** or **Destructive**, and tells you what the skill's steps may do. With no skills you see "No skills yet."

## Build a skill in chat

1. Click **New skill**, then **Build a skill in chat**. A new chat opens with a "skill-creator" tag and the start of a message: "Create a skill for".
2. Finish the sentence, for example "Create a skill for writing release notes for Acme Analytics", and answer Clara's questions.
3. Clara shows the skill as a card in the chat. Click **Add to my organization skills**.

**You should see:** "Skill saved and live." The skill now appears on the **Skills** tab.

## Import a skill from GitHub

1. Click **New skill**, then **Import from GitHub**.
2. Paste a public GitHub directory URL, or a SKILL.md file URL, for example https://github.com/owner/repo/tree/main/path/to/skill.
3. In **Review before saving**, check **Name**, **Description** and **Instructions**. Optionally set **Drafts this content type (optional)**, **Tags / capabilities (optional)** and **Allowed tools / connectors**.
4. Click **Save skill**, or **Discard draft**.

Nothing is saved until you click **Save skill**.

## Use a skill

- In any chat, click **Add skills** in the message box and pick one, or click **Use in chat** on the skill's card.
- In a play, open **More options** and choose **Additional skill**.

## Manage a skill

Open a skill with **View instructions**. The page shows its status, version, source and how often it ran, with **Skill details -- full instructions**, tags and allowed tools.

- **Export .zip** downloads the skill as a package. Anyone who can open the skill can do this.
- People who manage the skill can also **Edit / create version**, **Import new version from GitHub**, **Archive** and **Delete version** or **Delete skill**. An archived version can be restored with **Restore**.
- **Version history** lists every version. **Execution audit** lists when workflows ran the skill (Version, Status, Content piece, Actor, When). Until then it says "Not run by a workflow yet."

## Share a skill

A custom skill is private to its creator until you share it. Organization admins can always manage every skill.

1. Open the skill and find **People**.
2. Under **Person**, choose a teammate, for example Jane Doe.
3. Under **Role**, choose **Viewer** or **Manager**.
4. Click **Grant access**. **Remove** takes access away.

<video src="/assets/docs/context/skills-share.mp4" poster="/assets/docs/context/skills-share.jpg" autoplay muted loop playsinline aria-label="On the Launch checklist skill page, choosing Jane Doe and the Viewer role under People and clicking Grant access; Jane Doe appears in the People list as a Viewer"></video>

- **Viewer** can read the skill and use it.
- **Manager** can also edit it and manage its people.

> **Note:** To create a skill you need the Editor role or be an organization admin. Without it, **New skill** is greyed out with "You have view-only access. Ask an organization admin for the Editor role to do this." A skill you don't have access to doesn't appear.

## FAQ

**What is in a skill package?** A SKILL.md file with the name, description and instructions, and an optional list of tags and allowed tools.

**Can a skill publish things?** A skill is instructions. What it may do depends on the tools and connectors you allow and on your autonomy settings. See [Choose your level of autonomy](/docs/automate/autonomy).

**How do I share a skill?** Open it, find **People**, and grant a teammate **Viewer** or **Manager** access.

**What does the risk badge mean?** It shows the kind of action the skill involves, from **Read** to **Destructive**.

## Next steps
- [Brand guidelines](/docs/context/brand)
- [Build your marketing team](/docs/automate/agents)
- [Home and New chat](/docs/chat/new-chat)
