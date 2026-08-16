# Master Organizer Dashboard

A local developer dashboard for tracking in-progress Jira tickets across multiple services and PRs. Built as a Vue 3 single-page app served by a lightweight Python server — no build step, no npm, no cloud dependency. Vue 3 is loaded from CDN via an ES module importmap.

![Dashboard showing ticket tiles grouped by epic with PR deployment status](.github/preview.png)

---

## What it does

- **Ticket tiles** grouped by Jira epic, showing status, services touched, current stage, latest update, next steps, and PRs
- **PR deployment pipeline** — each PR chip shows Queued / QA / Prod tags; only the currently deployed environment is highlighted green
- **Live working indicator** — a pulsing green dot appears on a tile while a Claude session is actively working on that ticket
- **Checklist view** — per-ticket implementation plan displayed as a collapsible timeline with stage-level progress (fraction bar), blocked/waiting states, and inline blocker notes
- **Epic grouping** with collapse/expand, Jira epic icon, and count badge
- **Grid and Table views** — toggle in the header
- **PR sync** — one-click GitHub PR state refresh via `gh` CLI
- **Tilt / ticket switching** — switch your local dev environment between tickets
- **macOS desktop notifications** — notifies when a Claude session finishes working on a ticket (with custom app icon on the left)
- **SSE auto-reload** — dashboard refreshes automatically when `master-organizer.json` changes on disk

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Python 3.8+ | Ships with macOS |
| `gh` CLI | `brew install gh` — needed for PR sync |
| `master-organizer.json` | Your ticket data file (see below) |
| `JIRA_TICKETS_WORKDIR` | Directory where per-ticket working dirs live |

Optional (for enhanced features):

| Requirement | Notes |
|---|---|
| `librsvg` (`rsvg-convert`) | `brew install librsvg` — needed for notification icon |
| `terminal-notifier` | `brew install terminal-notifier` — fallback notification path |
| Xcode CLI tools | `xcode-select --install` — needed to compile the notification helper |

---

## Quickstart

**1. Clone the repo**

```bash
git clone git@github.com:rariasyacupoma/master-organizer-dashboard.git
cd master-organizer-dashboard
```

**2. Set up your environment variables** (add to `~/.zshrc` or `~/.bashrc`)

```bash
# Required: directory that holds per-ticket working dirs
export JIRA_TICKETS_WORKDIR=~/workspace/jira-tickets

# Required: your default service checkout directory (for Tilt switching)
export DEFAULT_WORKDIR=~/workspace/default

# Optional: override GitHub org dir (defaults to ~/go/src/github.com/calculi-corp)
export GITHUB_CCORP_ORG_DIR=~/go/src/github.com/your-org
```

**3. Create your `master-organizer.json`**

Copy the example and fill in your tickets:

```bash
cp master-organizer.example.json master-organizer.json
```

See [Data file format](#data-file-format) below.

**4. Start the dashboard**

```bash
./bin/master-organizer-dashboard.sh
```

This kills any existing server on port 7891, starts a fresh one, and opens `http://localhost:7891` in your browser.

Or start it manually:

```bash
cd master-organizer-ui
python3 server.py
```

**5. (Optional) Install macOS desktop notifications with custom icon**

```bash
./bin/install-notifications.sh
```

Follow the prompt to allow notifications in System Settings → Notifications → MasterOrganizer.

---

## Data file format

`master-organizer.json` lives at the repo root. The server reads it on every request — edit it directly and the dashboard reflects changes within seconds.

### Simple view (no implementation plan)

```json
{
  "tickets": [
    {
      "id": "CBP-12345",
      "title": "Migrate recent records from Cassandra to Postgres",
      "url": "https://your-org.atlassian.net/browse/CBP-12345",
      "status": "in_progress",
      "services": ["rbac-service", "asset-service"],
      "currentStage": 3,
      "latestUpdate": "Stage 2 PRs merged and validated in prod",
      "nextSteps": [
        "Open Stage 3 PR in rbac-service",
        "Enable feature flag in QA"
      ],
      "prs": [
        {
          "repo": "rbac-service",
          "number": 821,
          "url": "https://github.com/your-org/rbac-service/pull/821",
          "label": "Stage 2: read from Postgres",
          "state": "merged",
          "version": "0.1.3640"
        }
      ]
    }
  ]
}
```

### StageChecklist view (implementation plan with stages)

When a ticket has a formal implementation plan broken into stages, replace `latestUpdate`, `nextSteps`, and `prs` with a `stages` array. The dashboard switches to the timeline/checklist tile view automatically.

```json
{
  "id": "CBP-12345",
  "title": "Migrate recent records from Cassandra to Postgres",
  "url": "https://your-org.atlassian.net/browse/CBP-12345",
  "status": "in_progress",
  "services": ["rbac-service"],
  "stages": [
    {
      "name": "Add timestamp to model",
      "status": "done",
      "checklist": [
        { "label": "PR created", "done": true },
        { "label": "PR merged",  "done": true }
      ],
      "prs": [{ "repo": "rbac-service", "number": 821, "url": "...", "state": "merged", "version": "0.1.3640" }]
    },
    {
      "name": "Feature-flag reads",
      "status": "in_progress",
      "checklist": [
        { "label": "PR created",          "done": true },
        { "label": "PR merged",           "done": false },
        { "label": "Flag enabled in QA",  "done": false }
      ],
      "prs": [{ "repo": "rbac-service", "number": 839, "url": "...", "state": "open" }]
    }
  ]
}
```

**`status`** — `in_progress` | `blocked` | `waiting`

**Stage `status`** — `done` | `in_progress` | `blocked` | `waiting` | `pending`

---

## Per-ticket working directory

The server reads additional data from `$JIRA_TICKETS_WORKDIR/<ticket-id>/`:

| File | Purpose |
|---|---|
| `.jira-info.json` | Epic assignment, ticket title, status, `working: true/false` |
| `implementation-plan.md` | Shown via the Plan button on each tile |
| `checklist.json` | *(future)* Per-ticket checklist state |

**`.jira-info.json` example:**

```json
{
  "title": "Migrate recent records from Cassandra to Postgres",
  "status": "in_progress",
  "epic": "CBP-EPIC-42",
  "working": false
}
```

**`.epics.json`** at `$JIRA_TICKETS_WORKDIR/.epics.json`:

```json
[
  {
    "id": "CBP-EPIC-42",
    "title": "Cassandra to Postgres Migration",
    "url": "https://your-org.atlassian.net/browse/CBP-EPIC-42"
  }
]
```

---

## Frontend architecture

The dashboard uses **Vue 3** loaded from CDN (no build step). `index.html` is a thin shell that mounts the app; all logic lives in ES module component files under `master-organizer-ui/components/`:

| File | Purpose |
|---|---|
| `App.js` | Root component — data fetching, SSE, tilt polling, overlays |
| `store.js` | Reactive global store shared by all components |
| `EpicGroup.js` | Collapsible epic group with card grid |
| `TicketCard.js` | Card branching Simple vs StageChecklist view |
| `StageChecklist.js` | Timeline rail with stage rows, fraction bars, PR chips |
| `PrChip.js` | PR chip with live Queued/QA/Prod env tags |
| `CardActions.js` | Terminal / Plan / Deploy action buttons |
| `WorkingIndicator.js` | Pulsing green working dot |
| `StatusBadge.js` | Blocked / Waiting status badge |
| `Sidebar.js` | Tilt section, sessions, databases, port forwards |
| `TableView.js` | Compact table view |
| `DeploymentsOverlay.js` | Full-screen deployments table (QA vs Prod) |
| `PlanOverlay.js` | Full-screen implementation plan viewer |
| `ToastContainer.js` | Toast notification stack |

---

## Scripts

| Script | What it does |
|---|---|
| `bin/master-organizer-dashboard.sh` | Start (or restart) the server and open the browser |
| `bin/install-notifications.sh` | Build the macOS notification helper app with custom icon |
| `bin/sync-prs.sh` | Refresh PR states from GitHub (also triggered by the ⟳ button) |
| `bin/update-deployments.sh` | Pull latest deployment versions from your helmfiles |

---

## Port

Server runs on **`http://localhost:7891`**. Change the port in `master-organizer-ui/server.py` (last line) and `bin/master-organizer-dashboard.sh` if needed.

---

## Future improvements

See [`future-improvements.md`](./future-improvements.md) for planned enhancements: staleness indicators, PR review state, inline notes, linked tickets, and full checklist wiring.
