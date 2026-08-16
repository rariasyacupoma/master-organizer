# Future improvements — master-organizer UI

Things observed during checklist design that the current tile doesn't address yet.
Designs / mockups already exist in `master-organizer-ui/checklist-preview.html`.

---

## 1 · Staleness / time-on-stage indicator

Show how long a ticket has been stuck in the current stage.
An amber `8d` pill appears inline with the fraction bar when a stage hasn't moved past a threshold (e.g. 5 days).
A card-level "Updated Xh ago" line shows the last time any checklist item was checked off.

**Where data comes from:** timestamp stored in `.jira-info.json` when a stage transitions; compared against `Date.now()` on the server at request time.

---

## 2 · PR review state (reviewers + approval count)

Show reviewer initials and approval count directly on the PR chip (e.g. `JD MR  1/2 ✓`).
The card-level badge would become "In review" when a PR is open and waiting.

**Where data comes from:** `sync-prs.sh` already fetches PR metadata — extend it to also store `reviewers` and `approvals` in the PR record.

---

## 3 · Inline note

A quiet free-text note on the ticket (not a blocker, just context — e.g. "check rounding logic before merging stage 2").
Softer style than the red/amber blocker banner — grey background, no colored border.
Supports a single note per ticket (not a thread); can be edited in place.

**Where data comes from:** `note` field in `.jira-info.json`, editable via a POST endpoint on the server.

---

## 4 · Linked / dependent tickets

Show "blocks" and "blocked by" relationships as small chips below the services row.
A cross-ticket blocker (e.g. `blocked by INFRA-4421 🚫`) surfaces without opening Jira.

**Where data comes from:** `links` array in `.jira-info.json` (already populated by the Jira sync skill for some tickets).

---

## 5 · Checklist wiring (implementation plan → real tile)

The checklist UI designed in `checklist-preview.html` (timeline rail, fraction bar, PR chips per stage, blocked/waiting states) is still a standalone preview.
Next step: wire it into the real dashboard tile, backed by a `checklist.json` per ticket stored under `$JIRA_TICKETS_WORKDIR/<id>/`.
The checklist state (checked items, blocked notes, stage order) should persist across page reloads via a POST endpoint.
