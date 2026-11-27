---
title: Build your marketing team
description: Give agents a role and let workflows turn that direction into repeatable work.
order: 1
---
# Build your marketing team

An agent is a role you give Clara. It has a goal, standing instructions, shared learning and one or more jobs. Each job is a workflow with its own steps, triggers, versions and activity history. A workflow can also run on its own.

**Where to find it:** sidebar → **Agents** and **Workflows**

## Agents own the role; workflows do the jobs

Use **Agents** to manage your team and **Workflows** to inspect or build the sequences behind the work. A workflow that belongs to an agent shows that relationship.

## Start from the Agent library

1. Open **Agents → Agent library**.
2. Preview the jobs of Content Writer, Social Manager, Search Visibility or Competitor Analyst.
3. Choose the jobs you need and tailor the instructions to your product.

For example, Social Manager has jobs to plan the week, fill calendar gaps and repurpose published posts. Search Visibility needs a website, and social publishing needs a connected channel.

You can also build your own agent or use an existing standalone workflow as its first job.

## Build a standalone workflow on the canvas

1. Open **Workflows → New workflow**.
2. Name the automation, then add blocks to its canvas and connect the steps. Use research, content generation, conditions, loops, reviews and connected actions to model the process.
3. Select a block to edit its properties. Use **Fit workflow** to see the whole graph.
4. Save your draft before activation.

Separate branches can run independently. A step that joins them waits for its dependencies. **Build with Clara** lets you describe the workflow and refine it in conversation.

## Choose how each job starts

In a workflow, select its **Trigger** step. Jobs can start when you ask, on a schedule, from a supported Clara event, or through a configured incoming webhook. Scheduled start rules can have their own instructions, timing and timezone.

Events include a published post, a detected competitor update and a gap in the calendar. A publication can start repurposing, and a calendar gap can start a new draft. These are separate runs, each visible in **Activity**.

## Test, then activate

1. Inspect the steps, context, connections and approval settings.
2. Use **Run once** on a job with a published workflow version to check the result.
3. Activate the agent.

Activating an agent makes its eligible jobs available to their automatic start rules. A job paused individually stays paused.

> **Note:** A trigger starts the workflow, not the publication. Give generation and review enough time, and plan delivery through the publishing step or Calendar.

## Follow the work and keep learning

Use the agent's **Jobs** tab to manage its workflows and **Activity** to follow outputs and reviews. **Learning** holds editable lessons from available results and preferences from your reviews. These can inform the agent's later generation steps. Performance lessons need enough synced results to be meaningful.

Pause an agent to stop future automatic starts across its jobs, or pause an individual job. Workflows that are already running may continue. Use the autonomy controls to hold automatic publication.

## Choose the autonomy that fits

> **Note:** New agents can start with approval restrictions even when the workspace uses Autopilot. Check the agent's autonomy summary as well as the organization settings before you expect automatic publishing.

## Next steps
- [Choose your level of autonomy](/docs/automate/autonomy)
- [From a brief to a first draft](/docs/create/plays)
