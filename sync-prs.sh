#!/usr/bin/env bash
# Checks every PR in master-organizer.json against GitHub and updates state + release version.
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

result=$(jq -c '.tickets[] | select(.status == "in_progress")' "$JSON")
new_json=$(jq '.' "$JSON")

while IFS= read -r ticket; do
  ticket_id=$(echo "$ticket" | jq -r '.id')
  ticket_index=$(echo "$new_json" | jq --arg id "$ticket_id" '.tickets | map(.id) | index($id)')
  pr_index=0

  while IFS= read -r pr; do
    url=$(echo "$pr" | jq -r '.url')
    if echo "$url" | grep -q "github.com/.*/pull/"; then
      repo_path=$(echo "$url" | sed 's|https://github.com/||' | sed 's|/pull/.*||')
      pr_number=$(echo "$url" | grep -o '[0-9]*$')
      repo_name=$(echo "$repo_path" | sed 's|.*/||')

      echo -n "  $ticket_id PR #$pr_number ($repo_name)... "

      gh_json=$(gh pr view "$pr_number" --repo "$repo_path" --json state,mergedAt,mergeCommit 2>/dev/null) || gh_json='{"state":"OPEN","mergedAt":null,"mergeCommit":null}'

      gh_state=$(echo "$gh_json" | jq -r 'if .mergedAt != null then "merged" elif .state == "CLOSED" then "closed" else "open" end') || gh_state="open"

      new_json=$(echo "$new_json" | jq \
        --argjson ti "$ticket_index" \
        --argjson pi "$pr_index" \
        --arg state "$gh_state" \
        '.tickets[$ti].prs[$pi].state = $state') || true

      # Resolve release version for merged PRs
      if [ "$gh_state" = "merged" ]; then
        merge_oid=$(echo "$gh_json" | jq -r '.mergeCommit.oid // ""')
        release_version=""

        if [ -n "$merge_oid" ]; then
          repo_dir="$DEFAULT_WORKDIR/$repo_name"
          if [ -d "$repo_dir/.git" ]; then
            # Fetch latest tags quietly
            git -C "$repo_dir" fetch --tags --quiet 2>/dev/null || true
            release_version=$(git -C "$repo_dir" tag --contains "$merge_oid" 2>/dev/null | sort -V | head -1) || true
          fi
        fi

        if [ -n "$release_version" ]; then
          echo "$gh_state · v$release_version"
          new_json=$(echo "$new_json" | jq \
            --argjson ti "$ticket_index" \
            --argjson pi "$pr_index" \
            --arg ver "$release_version" \
            '.tickets[$ti].prs[$pi].version = $ver') || true
        else
          echo "$gh_state · (version unknown)"
          new_json=$(echo "$new_json" | jq \
            --argjson ti "$ticket_index" \
            --argjson pi "$pr_index" \
            '.tickets[$ti].prs[$pi].version = null') || true
        fi
      else
        echo "$gh_state"
        new_json=$(echo "$new_json" | jq \
          --argjson ti "$ticket_index" \
          --argjson pi "$pr_index" \
          '.tickets[$ti].prs[$pi].version = null') || true
      fi
    fi
    pr_index=$((pr_index + 1))
  done < <(echo "$ticket" | jq -c '.prs[]')
done < <(echo "$result")

echo "$new_json" | jq '.' > "$TMP" && mv "$TMP" "$JSON"
echo "Done. $JSON updated."
