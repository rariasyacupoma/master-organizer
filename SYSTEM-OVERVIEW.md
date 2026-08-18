# Master Organizer — System Overview

## Data files (source of truth)

| File | Purpose |
|---|---|
| `master-organizer.json` | All active tickets, stages, PRs, statuses — the main document |
| `deployments-qa.json` | Currently deployed service versions in QA |
| `deployments-prod.json` | Currently deployed service versions in Prod |
| `$JIRA_TICKETS_WORKDIR/<id>/.jira-info.json` | Per-ticket: epic, title, status, `working`, `workingSince` |
| `$JIRA_TICKETS_WORKDIR/.epics.json` | Epic metadata (id, title, url) |
| `$JIRA_TICKETS_WORKDIR/<id>/implementation-plan.md` | Full implementation plan viewed via the Plan button |

## Dashboard UI (`master-organizer-ui/`)

| File | Purpose |
|---|---|
| `index.html` | App shell, all CSS, Vue 3 importmap |
| `server.py` | Python HTTP server: serves UI, all API endpoints, SSE auto-reload, toggle-checklist-item |
| `components/App.js` | Root component — data fetching, SSE, polling, overlays, all actions |
| `components/store.js` | Reactive global store shared by all components |
| `components/TicketCard.js` | Card with FLIP focus animation, branches Simple vs StageChecklist view |
| `components/StageChecklist.js` | Timeline rail, stage rows, fraction bars, PR chips, blocker/waiting notes |
| `components/PrChip.js` | PR chip: left-accent strip, state icon, version, Queued/QA/Prod env tags |
| `components/CardActions.js` | Terminal / Plan / Deploy action buttons with spinners |
| `components/WorkingIndicator.js` | Pulsing WORKING badge with elapsed time |
| `components/StatusBadge.js` | Blocked / Waiting / In Progress status badge |
| `components/EpicGroup.js` | Collapsible epic group with tile grid |
| `components/Sidebar.js` | Tilt section, sessions, databases, port forwards |
| `components/TableView.js` | Compact table view |
| `components/DeploymentsOverlay.js` | Full-screen QA vs Prod deployments table |
| `components/PlanOverlay.js` | Full-screen implementation plan viewer |
| `components/ToastContainer.js` | Toast notification stack |

## Scripts

| Script | Purpose |
|---|---|
| `bin/master-organizer-dashboard.sh` | Start/restart server and open browser |
| `sync-prs.sh` | Sync PR states + versions + QA/Prod deployment flags from GitHub and deployments JSONs |
| `bin/update-deployments.sh` | Update `deployments-*.json` from a Slack deployment notification message |
| `focus-terminal-tab.sh` | Focus the terminal tab for a ticket |
| `open-db-tab.sh` | Open a DB session tab |
| `bin/install-notifications.sh` | Build macOS notification helper app with custom icon |

## Claude bin scripts (`~/.claude/bin/`)

| Script | Purpose |
|---|---|
| `set-working-status.sh` | Set `working: true/false` + `workingSince` ISO timestamp in `.jira-info.json` |
| `set-session-jira.sh` | Associate current Claude session with a Jira ticket ID |
| `get-session-jira.sh` | Get the Jira ticket ID for the current session |
| `use-jira-session.sh` | Switch active session context to a ticket |
| `jira-get-ticket.sh` | Fetch Jira ticket metadata |
| `jiracd.sh` | cd into a ticket's workspace directory |
| `slack-latest-message.sh` | Read latest Slack message (used for deployment notifications) |
| `update-default-workdir.sh` | Update the DEFAULT_WORKDIR env var |

## Claude skills (`~/.claude/skills/`)

| Skill | Purpose |
|---|---|
| `master-organizer/SKILL.md` | Main skill: JSON structure, update rules, blocked/waiting distinction, auto-complete rule, working field protocol, transition to StageChecklist view |
| `multi-stage-development-with-github-and-jira` | How to work multi-stage tickets with PRs across services |
| `using-shell-commands` | Shell command rules for Claude (no compound cd, no inline env vars, etc.) |
| `how-to-write-testfiles` | Test file writing conventions |
| `testing-strategy-and-heuristics` | Testing strategy and heuristics |
| `what-is-a-test-spec` | What a test spec is and how to write one |
| `double-analysis` | How to do double-pass analysis |
| `double-PR-review` | How to do double-pass PR review |
| `inline-instructions-for-claude` | How inline instructions work in code |
