# Schema options for the new checklist tile UI

Three approaches for evolving the JSON structure to support the new timeline-checklist design.
All use CBP-37271 (5-stage Cassandra → Postgres migration) as the example ticket.

---

## What the new UI needs that the current schema doesn't have

| Need | Current schema | Gap |
|---|---|---|
| Stage names | `label` on each PR | Not a first-class concept |
| Per-stage checklist items | `nextSteps` (free text, flat) | Not structured or checkable |
| PRs grouped by stage | Flat `prs` array with `label` hint | No explicit grouping |
| Per-PR deployment state (QA / Prod) | Missing | Derived externally today |
| Blocked/waiting note per stage | `latestUpdate` (one per ticket) | Can't target a specific stage |
| Stage completion status | `currentStage` integer | Coarse — just "which stage am I on" |

---

## Option A — `stages` replaces `prs`

**File:** `option-a-stages-replace-prs.json`

Stages become the primary structure. The flat `prs` list is gone; PRs live inside their stage. Checklist items, deployment state, and blocker note are all owned by the stage.

```
ticket
  └── stages[]
        ├── name, status, blockerNote
        ├── checklist[]  ← { label, done }
        └── prs[]        ← { repo, number, state, version, deployments }
```

**Best fit if:** you're ready to fully commit to the new design and don't need the fallback view. Clean and simple to render — the UI just walks stages.

**Migration cost:** high — every ticket needs its `prs` rewritten into stages. `sync-prs.sh` needs updating to find PRs inside stages.

---

## Option B — `stages` added alongside existing fields

**File:** `option-b-stages-plus-legacy.json`

`stages` is an optional new field. Tickets that have it get the new timeline tile. Tickets without it fall back to `latestUpdate` / `nextSteps` / flat `prs` — the current view.

```
ticket
  ├── currentStage, latestUpdate, nextSteps  ← kept as-is
  ├── prs[]                                  ← kept as-is (sync-prs.sh still works)
  └── stages[]  (optional)
        ├── name, status, blockerNote
        ├── checklist[]
        └── prs[]  ← duplicated from the flat list (just this stage's PRs)
```

**Best fit if:** you want a gradual migration — add `stages` to one ticket at a time as you refine your implementation plan. The dashboard can detect `stages` presence and switch views per-tile.

**Migration cost:** low to start, but eventually you carry duplicate PR data (flat + nested). Pick a cleanup deadline.

---

## Option C — `master-organizer.json` stays lean; checklist in a separate file

**File:** `option-c-checklist-file.json`

`master-organizer.json` doesn't change. A new `checklist.json` per ticket lives next to `implementation-plan.md` in `$JIRA_TICKETS_WORKDIR/<id>/`. The server merges them at request time. PRs in the checklist file are referenced by number, not duplicated.

```
master-organizer.json (unchanged)
  └── tickets[] ← same as today

$JIRA_TICKETS_WORKDIR/CBP-37271/checklist.json (new)
  └── stages[]
        ├── name, status, blockerNote
        ├── checklist[]
        └── prs: [842]  ← PR numbers; server joins with full PR objects
```

**Best fit if:** you want zero disruption to `master-organizer.json` and are comfortable with checklist state living only on your machine (not committed). Already consistent with how `implementation-plan.md` and `.jira-info.json` work.

**Migration cost:** zero for the main file. New file format to write when you create a ticket's checklist.

---

## Recommendation

**Start with Option B** — add `stages` as an optional field. It costs nothing for tickets that don't have it yet, `sync-prs.sh` keeps working unchanged, and you can add a checklist to one ticket to validate the UI before migrating the rest. Once all tickets have stages, drop `latestUpdate`/`nextSteps`/the flat `prs` list in a follow-up cleanup.

**Option C** is attractive if you want the `master-organizer.json` to stay in the repo without ever containing implementation details — since it keeps all structured planning data in the local `$JIRA_TICKETS_WORKDIR`. But it requires the server to do an extra file read per ticket on every request.
