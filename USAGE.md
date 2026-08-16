# Master Organizer — Usage Guide

A local dashboard for tracking in-progress Jira tickets across multiple services and PRs.

---

## Starting the dashboard

```bash
cd /Users/rariasyacupoma/workspace/local-development/master-organizer
python3 server.py
```

Open **http://localhost:7891** in your browser.

---

## The data file

All ticket data lives in **`master-organizer.json`**. Edit it directly to add, update, or remove tickets.

Each ticket has:
- `id` — Jira ticket ID (e.g. `CBP-12345`)
- `status` — `in_progress` | `blocked` | `waiting` | `new`
- `theme` — `cass2pg` | `security` | `test-revamp` | `infra`
- `services` — list of repos involved
- `currentStage` — which stage you're on
- `nextAction` — one-liner describing what comes next
- `prs` — list of PRs, each with `repo`, `number`, `url`, `label`, `state`

PR `state` is `open` | `merged` | `closed`.

---

## Views

Toggle between three views using the buttons in the top-right:

| View | Best for |
|------|----------|
| **Grid** | Day-to-day overview — 4 tiles per row |
| **Kanban** | Seeing what's blocked vs in-flight at a glance |
| **Table** | Scanning many tickets quickly |

---

## Syncing PR states

Click **⟳ Sync PRs** in the header to check GitHub for the latest state of every open PR across all `in_progress` tickets. It updates `master-organizer.json` in place and refreshes the dashboard automatically.

Requires the `gh` CLI to be authenticated (`gh auth status`).

---

## Color coding

The left border on each card indicates the ticket theme:

- 🟣 Purple — Cassandra → Postgres migration
- 🔴 Red — Security fix
- 🔵 Cyan — Test revamp
- 🟡 Amber — Infra / platform

---

## Updating a ticket

Open `master-organizer.json` and edit the relevant entry. The dashboard reloads the file fresh on every page load and after each PR sync — no build step needed.
