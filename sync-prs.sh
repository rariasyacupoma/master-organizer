#!/usr/bin/env bash
# Checks every PR in master-organizer.json against GitHub and updates state + release version.
# Handles both flat .prs[] (Simple view) and .stages[].prs[] (StageChecklist view).
# Requires: gh (GitHub CLI), jq, git

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JSON="$SCRIPT_DIR/master-organizer.json"
TMP="$SCRIPT_DIR/.master-organizer.tmp.json"
DEFAULT_WORKDIR="/Users/rariasyacupoma/workspace/default"

echo "Pulling platform-helmfiles..."
git -C "$DEFAULT_WORKDIR/platform-helmfiles" pull --ff-only --quiet \
  && echo "  platform-helmfiles up to date." \
  || echo "  Warning: could not pull platform-helmfiles (continuing anyway)."

echo "Syncing PR states and release versions..."

new_json=$(jq '.' "$JSON")

# Sets globals RESOLVED_STATE and RESOLVED_VERSION (empty if unknown/not merged).
resolve_pr() {
  local url="$1" repo_path pr_number repo_name gh_json merge_oid repo_dir
  repo_path=$(echo "$url" | sed 's|https://github.com/||' | sed 's|/pull/.*||')
  pr_number=$(echo "$url" | grep -o '[0-9]*$')
  repo_name=$(echo "$repo_path" | sed 's|.*/||')

  echo -n "  $ticket_id PR #$pr_number ($repo_name)... "

  gh_json=$(gh pr view "$pr_number" --repo "$repo_path" --json state,mergedAt,mergeCommit 2>/dev/null) \
    || gh_json='{"state":"OPEN","mergedAt":null,"mergeCommit":null}'

  RESOLVED_STATE=$(echo "$gh_json" | jq -r 'if .mergedAt != null then "merged" elif .state == "CLOSED" then "closed" else "open" end') \
    || RESOLVED_STATE="open"
  RESOLVED_VERSION=""

  if [ "$RESOLVED_STATE" = "merged" ]; then
    merge_oid=$(echo "$gh_json" | jq -r '.mergeCommit.oid // ""')
    if [ -n "$merge_oid" ]; then
      repo_dir="$DEFAULT_WORKDIR/$repo_name"
      if [ -d "$repo_dir/.git" ]; then
        git -C "$repo_dir" fetch --tags --quiet 2>/dev/null || true
        RESOLVED_VERSION=$(git -C "$repo_dir" tag --contains "$merge_oid" 2>/dev/null | sort -V | head -1) || true
      fi
    fi
    if [ -n "$RESOLVED_VERSION" ]; then
      echo "$RESOLVED_STATE · v$RESOLVED_VERSION"
    else
      echo "$RESOLVED_STATE · (version unknown)"
    fi
  else
    echo "$RESOLVED_STATE"
  fi
}

while IFS= read -r ticket; do
  ticket_id=$(echo "$ticket" | jq -r '.id')
  ticket_index=$(echo "$new_json" | jq --arg id "$ticket_id" '.tickets | map(.id) | index($id)')

  # ── Flat PRs (Simple view) ──
  pr_index=0
  while IFS= read -r pr; do
    url=$(echo "$pr" | jq -r '.url')
    if echo "$url" | grep -q "github.com/.*/pull/"; then
      resolve_pr "$url"
      new_json=$(echo "$new_json" | jq \
        --argjson ti "$ticket_index" --argjson pi "$pr_index" --arg state "$RESOLVED_STATE" \
        '.tickets[$ti].prs[$pi].state = $state') || true
      if [ -n "$RESOLVED_VERSION" ]; then
        new_json=$(echo "$new_json" | jq \
          --argjson ti "$ticket_index" --argjson pi "$pr_index" --arg ver "$RESOLVED_VERSION" \
          '.tickets[$ti].prs[$pi].version = $ver') || true
      else
        new_json=$(echo "$new_json" | jq \
          --argjson ti "$ticket_index" --argjson pi "$pr_index" \
          '.tickets[$ti].prs[$pi].version = null') || true
      fi
    fi
    pr_index=$((pr_index + 1))
  done < <(echo "$ticket" | jq -c '.prs[]? // empty')

  # ── Staged PRs (StageChecklist view) ──
  stage_index=0
  while IFS= read -r stage; do
    pr_index=0
    while IFS= read -r pr; do
      url=$(echo "$pr" | jq -r '.url')
      if echo "$url" | grep -q "github.com/.*/pull/"; then
        resolve_pr "$url"
        new_json=$(echo "$new_json" | jq \
          --argjson ti "$ticket_index" --argjson si "$stage_index" --argjson pi "$pr_index" --arg state "$RESOLVED_STATE" \
          '.tickets[$ti].stages[$si].prs[$pi].state = $state') || true
        if [ -n "$RESOLVED_VERSION" ]; then
          new_json=$(echo "$new_json" | jq \
            --argjson ti "$ticket_index" --argjson si "$stage_index" --argjson pi "$pr_index" --arg ver "$RESOLVED_VERSION" \
            '.tickets[$ti].stages[$si].prs[$pi].version = $ver') || true
        else
          new_json=$(echo "$new_json" | jq \
            --argjson ti "$ticket_index" --argjson si "$stage_index" --argjson pi "$pr_index" \
            '.tickets[$ti].stages[$si].prs[$pi].version = null') || true
        fi
      fi
      pr_index=$((pr_index + 1))
    done < <(echo "$stage" | jq -c '.prs[]? // empty')
    stage_index=$((stage_index + 1))
  done < <(echo "$ticket" | jq -c '.stages[]? // empty')

done < <(jq -c '.tickets[] | select(.status == "in_progress")' "$JSON")

echo "$new_json" | jq '.' > "$TMP" && mv "$TMP" "$JSON"
echo "Done. $JSON updated."
